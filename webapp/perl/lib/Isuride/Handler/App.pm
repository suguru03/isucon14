package Isuride::Handler::App;
use v5.40;
use utf8;

use HTTP::Status qw(:constants);
use Types::Standard -types;

use Isuride::Util qw(check_params);

use constant AppPaymentMethodsRequest => Dict [ token => Str, ];

sub app_post_payment_methods ($self, $c) {
    my $params = $c->req->json_parameters;

    unless (check_params($params, AppPaymentMethodsRequest)) {
        return $c->halt(HTTP_BAD_REQUEST, 'failed to decode the request body as json');
    }

    if ($params->{token} eq '') {
        return $c->halt(HTTP_BAD_REQUEST, 'token is required but was empt');
    }

    my $user = $c->stash->{user};

    $c->dbh->query(
        q{INSERT INTO payment_methods (user_id, token) VALUES (?, ?)},
        $user->{id}, $params->{token});

    $c->halt_no_content(HTTP_OK);
}
