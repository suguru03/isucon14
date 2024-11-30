package Isuride::Web;
use v5.40;
use utf8;

use Kossy;
use Kossy::Exception;

use DBIx::Sunny;
use Cpanel::JSON::XS;
use Cpanel::JSON::XS::Type;
use HTTP::Status qw(:constants);

$Kossy::JSON_SERIALIZER = Cpanel::JSON::XS->new()->ascii(0)->utf8->allow_blessed(1)->convert_blessed(1);

use Isuride::Middleware;
use Isuride::Handler::App;
use Isuride::Handler::Owner;
use Isuride::Handler::Chair;
use Isuride::Handler::Internal;
use Isuride::Util qw(check_params);

sub connect_db() {
    my $host     = $ENV{ISUCON_DB_HOST}     || '127.0.0.1';
    my $port     = $ENV{ISUCON_DB_PORT}     || '3306';
    my $user     = $ENV{ISUCON_DB_USER}     || 'isucon';
    my $password = $ENV{ISUCON_DB_PASSWORD} || 'isucon';
    my $dbname   = $ENV{ISUCON_DB_NAME}     || 'isuride';

    my $dsn = "dbi:mysql:database=$dbname;host=$host;port=$port";
    my $dbh = DBIx::Sunny->connect(
        $dsn, $user,
        $password,
        {
            mysql_enable_utf8mb4 => 1,
            mysql_auto_reconnect => 1,
        }
    );
    return $dbh;
}

sub dbh ($self) {
    $self->{dbh} //= connect_db();
}

use constant AppAuthMiddleware   => qq(app_auth_middleware);
use constant OwnerAuthMiddleware => qq(owner_auth_middleware);
use constant ChairAuthMiddleware => qq(chair_auth_middleware);

# middleware
filter AppAuthMiddleware()   => \&Isuride::Middleware::app_auth_middleware;
filter OwnerAuthMiddleware() => \&Isuride::Middleware::owner_auth_middleware;
filter ChairAuthMiddleware() => \&Isuride::Middleware::chair_auth_middleware;

# router
{
    post '/api/initialize' => \&post_initialize;

    #  app handlers
    {
        post '/api/app/users' => \&Isuride::Handler::App::app_post_users;

        post '/api/app/payment-methods' => [AppAuthMiddleware] => \&Isuride::Handler::App::app_post_payment_methods;
        get '/api/app/rides' => [AppAuthMiddleware] => \&Isuride::Handler::App::app_get_rides;
        post '/api/app/rides'                     => [AppAuthMiddleware] => \&Isuride::Handler::App::app_post_rides;
        post '/api/app/rides/estimated-fare'      => [AppAuthMiddleware] => \&Isuride::Handler::App::app_post_rides_estimated_fare;
        post '/api/app/rides/:ride_id/evaluation' => [AppAuthMiddleware] => \&Isuride::Handler::App::app_post_ride_evaluation;
        get '/api/app/notification'  => [AppAuthMiddleware] => \&Isuride::Handler::App::app_get_notification;
        get '/api/app/nearby-chairs' => [AppAuthMiddleware] => \&Isuride::Handler::App::app_get_nearby_chairs;
    }

    # chair handlers
    {
        post '/api/chair/chairs' => \&Isuride::Handler::Chair::chair_post_chairs;

        post '/api/chair/activity'   => [ChairAuthMiddleware] => \&Isuride::Handler::Chair::chair_post_activity;
        post '/api/chair/coordinate' => [ChairAuthMiddleware] => \&Isuride::Handler::Chair::chair_post_coordinate;
        get '/api/chair/notification' => [ChairAuthMiddleware] => \&Isuride::Handler::Chair::chair_get_notification;
        post '/api/chair/rides/:ride_id/status' => [ChairAuthMiddleware] => \&Isuride::Handler::Chair::chair_post_ride_status;
    }

    # owner handlers
    {
        post '/api/owner/owners' => \&Isuride::Handler::Owner::owner_post_owners;

        get '/api/owner/sales'  => [OwnerAuthMiddleware] => \&Isuride::Handler::Owner::owner_get_sales;
        get '/api/owner/chairs' => [OwnerAuthMiddleware] => \&Isuride::Handler::Owner::owner_get_chairs;
    }

    # internal handlers
    {
        get '/api/internal/matching' => \&Isuride::Handler::Internal::internal_get_matching;
    }
}

use constant PostInitializeRequest => {
    payment_server => JSON_TYPE_STRING,
};

use constant PostInitializeResponse => {
    language => JSON_TYPE_STRING,
};

sub post_initialize ($self, $c) {
    my $params = $c->req->json_parameters;

    unless (check_params($params, PostInitializeRequest)) {
        return $c->halt_json(HTTP_BAD_REQUEST, 'failed to decode the request body as json');
    }

    if (my $e = system($self->root_dir . '/../sql/init.sh')) {
        return $c->halt_json(HTTP_INTERNAL_SERVER_ERROR, "failed to initialize: $e");
    }

    try {
        $self->dbh->query(
            q{UPDATE settings SET value = ? WHERE name = 'payment_gateway_url'},
            $params->{payment_server}
        );
    } catch ($e) {
        return $c->halt_json(HTTP_INTERNAL_SERVER_ERROR, $e);
    }

    return $c->render_json({ language => 'perl' }, PostInitializeResponse);
}

# XXX hack Kossy
{
    *Kossy::Connection::halt_json = sub ($c, $status, $message) {
        my $res = $c->render_json({ message => $message }, { message => JSON_TYPE_STRING });
        die Kossy::Exception->new($status, response => $res);
    };
}
