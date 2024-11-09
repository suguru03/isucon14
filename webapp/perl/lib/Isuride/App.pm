package Isuride::App;
use v5.40;
use utf8;

use Kossy;
use DBIx::Sunny;
use HTTP::Status qw(:constants);

sub connect_db() {
    my $host     = $ENV{ISUCON_DB_HOST}     || 'localhost';
    my $port     = $ENV{ISUCON_DB_PORT}     || '3306';
    my $user     = $ENV{ISUCON_DB_USER}     || 'isucon';
    my $password = $ENV{ISUCON_DB_PASSWORD} || 'isucon';
    my $dbname   = $ENV{ISUCON_DB_NAME}     || 'isuride';

    my $dsn = "dbi:mysql:database=$dbname;host=$host;port=$port";
    my $dbh = DBIx::Sunny->connect($dsn, $user, $password, {
            mysql_enable_utf8mb4 => 1,
            mysql_auto_reconnect => 1,
    });
    return $dbh;
}

sub dbh ($self) {
    $self->{dbh} //= connect_db();
}

{
    #  app handlers
    get '/'                          => \&default;
    get '/app/requests/{request_id}' => \&app_get_resuest;
}

sub default ($self, $c) {
    $c->render_json({ greeting => 'hello' });
}

sub app_get_resuest ($self, $c) {
    my $request_id = $c->args->{request_id};

}

# middleware
filter 'app_auth_middleware' => sub ($app) {
    sub ($self, $c) {
        my $access_token = $c->req->cookie('apps_session');

        unless ($access_token) {
            return res_error($c, HTTP_UNAUTHORIZED,
                'app_session cookie is required');
        }

        my $user = $c->dbh->select_row('SELECT * FROM users WHERE access_token = ?', $access_token);

        unless ($user) {
            return res_error($c, HTTP_UNAUTHORIZED,
                'invalid access_token');
        }

        $c->stash->{user} = $user;
        return $app->($self, $c);
    };
};

sub res_error ($c, $status_code, $err) {
    my $res = $c->render_json({ message => $err });
    $res->status($status_code);
    return $res;
}
