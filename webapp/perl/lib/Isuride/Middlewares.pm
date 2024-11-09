package Isuride::Middlewares;
use v5.40;
use utf8;
use Kossy qw(filter);
use HTTP::Status qw(:constants);

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
