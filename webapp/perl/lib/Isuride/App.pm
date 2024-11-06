package Isuride::App;
use v5.40;
use utf8;

use Kossy;

{
    get '/'                          => \&default;
    get '/app/requests/{request_id}' => \&app_get_resuest;
}

sub default ( $self, $c ) {
    $c->render_json( { greeting => 'hello' } );
}

sub app_get_resuest ( $self, $c ) {
    my $request_id = $c->args->{request_id};

}

