package Isuride::Handler::App;
use v5.40;
use utf8;

use HTTP::Status qw(:constants);
use Data::ULID::XS qw(ulid);
use Cpanel::JSON::XS::Type qw(JSON_TYPE_STRING JSON_TYPE_INT JSON_TYPE_STRING_OR_NULL json_type_arrayof);

use Isuride::Models qw(Coordinate);
use Isuride::Time qw(unix_milli_from_str);
use Isuride::Util qw(secure_random_str calculate_sale check_params);

use constant AppPostUsersRequest => {
    username        => JSON_TYPE_STRING,
    firstname       => JSON_TYPE_STRING,
    lastname        => JSON_TYPE_STRING,
    date_of_birth   => JSON_TYPE_STRING,
    invitation_code => JSON_TYPE_STRING_OR_NULL,
};

use constant AppPostUsersResponse => {
    id              => JSON_TYPE_STRING,
    invitation_code => JSON_TYPE_STRING,
};

sub app_post_users ($app, $c) {
    my $params = $c->req->json_parameters;

    unless (check_params($params, AppPostUsersRequest)) {
        return $c->halt_json(HTTP_BAD_REQUEST, 'failed to decode the request body as json');
    }

    if ($params->{username} eq '' || $params->{firstname} eq '' || $params->{lastname} eq '' || $params->{date_of_birth} eq '') {
        return $c->halt_json(HTTP_BAD_REQUEST, 'required fields(username, firstname, lastname, date_of_birth) are empty');
    }

    my $user_id         = ulid();
    my $access_token    = secure_random_str(32);
    my $invitation_code = secure_random_str(15);

    my $txn = $app->dbh->txn_scope;

    $app->dbh->query(
        q{INSERT INTO users (id, username, firstname, lastname, date_of_birth, access_token, invitation_code) VALUES (?, ?, ?, ?, ?, ?, ?)},
        $user_id, $params->{username}, $params->{firstname}, $params->{lastname}, $params->{date_of_birth}, $access_token, $invitation_code
    );

    # 初回登録キャンペーンのクーポンを付与
    $app->dbh->query(
        q{INSERT INTO coupons (user_id, code, discount) VALUES (?, ?, ?)},
        $user_id, 'CP_NEW2024', 3000,
    );

    # 紹介コードを使った登録
    if (defined $params->{invitation_code} && $params->{invitation_code} ne '') {
        # 招待する側の招待数をチェック
        my $coupons = $app->dbh->select_all(q{SELECT * FROM coupons WHERE code = ? FOR UPDATE}, "INV_" . $params->{invitation_code});

        if (scalar $coupons->@* >= 3) {
            return $c->halt_json(HTTP_BAD_REQUEST, 'この招待コードは使用できません。');
        }

        # ユーザーチェック
        my $inviter = $app->dbh->select_row(q{SELECT * FROM users WHERE invitation_code = ?}, $params->{invitation_code});

        unless ($inviter) {
            return $c->halt_json(HTTP_BAD_REQUEST, 'この招待コードは使用できません。');
        }

        # 招待クーポン付与
        $app->dbh->query(
            q{INSERT INTO coupons (user_id, code, discount) VALUES (?, ?, ?)},
            $user_id, "INV_" . $params->{invitation_code}, 1500,
        );

        # 招待した人にもRewardを付与
        $app->dbh->query(
            q{INSERT INTO coupons (user_id, code, discount) VALUES (?, ?, ?)},
            $inviter->{id}, "INV_" . $params->{invitation_code}, 1000,
        );
    }

    $txn->commit;

    $c->res->cookies->{apps_session} = {
        path  => '/',
        name  => 'app_session',
        value => $access_token,
    };

    my $res = $c->render_json({
            id              => $user_id,
            invitation_code => $invitation_code,
    }, AppPostUsersResponse);

    $res->status(HTTP_CREATED);
    return $res;
}

use constant AppPaymentMethodsRequest => { token => JSON_TYPE_STRING, };

sub app_post_payment_methods ($app, $c) {
    my $params = $c->req->json_parameters;

    unless (check_params($params, AppPaymentMethodsRequest)) {
        return $c->halt_json(HTTP_BAD_REQUEST, 'failed to decode the request body as json');
    }

    if ($params->{token} eq '') {
        return $c->halt_json(HTTP_BAD_REQUEST, 'token is required but was empt');
    }

    my $user = $c->stash->{user};

    $app->dbh->query(
        q{INSERT INTO payment_methods (user_id, token) VALUES (?, ?)},
        $user->{id}, $params->{token}
    );

    $c->halt_no_content(HTTP_NO_CONTENT);
}

use constant AppGetRidesResponseItemChair => {
    id    => JSON_TYPE_STRING,
    owner => JSON_TYPE_STRING,
    model => JSON_TYPE_STRING,
    model => JSON_TYPE_STRING,
};

use constant AppGetRidesResponseItem => {
    id                     => JSON_TYPE_STRING,
    pickup_coordinate      => Coordinate,
    destination_coordinate => Coordinate,
    chair                  => AppGetRidesResponseItemChair,
    fare                   => JSON_TYPE_INT,
    evaluation             => JSON_TYPE_INT,
    requested_at           => JSON_TYPE_INT,
    completed_at           => JSON_TYPE_INT,
};

use constant AppGetRidesResponse => {
    rides => json_type_arrayof(AppGetRidesResponseItem),
};

sub app_get_rides ($app, $c) {
    my $user = $c->stash->{user};

    my $rides = $app->dbh->select_all(
        q{SELECT * FROM rides WHERE user_id = ? ORDER BY created_at DESC},
        $user->{id}
    );

    my $items = [];

    for my $ride ($rides->@*) {
        my $status = get_latest_ride_status($c, $ride->{id});

        unless ($status) {
            return $c->halt_json(HTTP_INTERNAL_SERVER_ERROR, 'sql: no rows in result set');
        }

        if ($status ne 'COMPLETED') {
            next;
        }

        my $item = {
            id                => $ride->{id},
            pickup_coordinate => {
                latitude  => $ride->{pickup_latitude},
                longitude => $ride->{pickup_longitude},
            },
            destination_coordinate => {
                latitude  => $ride->{destination_latitude},
                longitude => $ride->{destination_longitude},
            },
            fare         => calculate_sale($ride),
            evaluation   => $ride->{evaluation},
            requested_at => unix_milli_from_str($ride->{created_at}),
            completed_at => unix_milli_from_str($ride->{updated_at}),
        };

        my $chair = $app->dbh->select_row(
            q{SELECT * FROM chairs WHERE id = ?},
            $ride->{chair_id}
        );

        unless ($chair) {
            return $c->halt_json(HTTP_INTERNAL_SERVER_ERROR, 'sql: no rows in result set');
        }

        $item->{chair}->{id}    = $chair->{id};
        $item->{chair}->{name}  = $chair->{name};
        $item->{chair}->{model} = $chair->{model};

        my $owener = $app->dbh->select_row(
            q{SELECT * FROM owners WHERE id = ?},
            $chair->{owner_id}
        );

        unless ($owener) {
            return $c->halt_json(HTTP_INTERNAL_SERVER_ERROR, 'sql: no rows in result set');
        }

        $item->{chair}->{owner} = $owener->{name};

        push $items->@*, $item;
    }

    return $c->render_json({ rides => $items }, AppGetRidesResponse);
}

sub get_latest_ride_status ($c, $ride_id) {
    $c->dbh->select_row(
        q{SELECT status FROM ride_statuses WHERE ride_id = ? ORDER BY created_at DESC LIMIT 1},
        $ride_id
    );
}
