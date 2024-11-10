package Isuride::Handler::App;
use v5.40;
use utf8;

use HTTP::Status qw(:constants);
use Types::Standard -types;

use Isuride::Util qw(check_params);

use constant AppRegisterRequest => Dict [
    username        => Str,
    firstname       => Str,
    lastname        => Str,
    date_of_birth   => Str,
    invitation_code => Optional [Str],
];

use constant AppPostRegisterResponse => Dict [
    id              => Str,
    invitation_code => Str,
];

sub test ($self, $c) {
    $c->render_json({ greeting => 'hello' });
}

sub app_post_register ($app, $c) {
    my $params = $c->req->json_parameters;

    unless (check_params($params, AppRegisterRequest)) {
        return $c->halt(HTTP_BAD_REQUEST, 'failed to decode the request body as json');
    }

    if ($params->{username} eq '' || $params->{firstname} eq '' || $params->{lastname} eq '' || $params->{date_of_birth} eq '') {
        return $c->halt(HTTP_BAD_REQUEST, 'required fields(username, firstname, lastname, date_of_birth) are empty');
    }

    my $user = $app->dbh->select_row(
        q{SELECT * FROM users WHERE token = ?},
        $params->{token}
    );

    unless ($user) {
        return $c->halt(HTTP_UNAUTHORIZED, 'token is invalid');
    }

    $c->stash->{user} = $user;
}

use constant AppPaymentMethodsRequest => Dict [ token => Str, ];

sub app_post_payment_methods ($app, $c) {
    my $params = $c->req->json_parameters;

    unless (check_params($params, AppPaymentMethodsRequest)) {
        return $c->halt(HTTP_BAD_REQUEST, 'failed to decode the request body as json');
    }

    if ($params->{token} eq '') {
        return $c->halt(HTTP_BAD_REQUEST, 'token is required but was empt');
    }

    my $user = $c->stash->{user};

    $app->dbh->query(
        q{INSERT INTO payment_methods (user_id, token) VALUES (?, ?)},
        $user->{id}, $params->{token}
    );

    $c->halt_no_content(HTTP_OK);
}
