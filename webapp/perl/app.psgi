use v5.40;
use FindBin;
use lib "$FindBin::Bin/lib";
use Plack::Builder;
use Kossy::Isuride::Web;
use File::Basename;

my $root_dir = File::Basename::dirname(__FILE__);

my $app = Kossy::Isuride::Web->psgi($root_dir);

builder {
    enable 'ReverseProxy';
    $app;
};
