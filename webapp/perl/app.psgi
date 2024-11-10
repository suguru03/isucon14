use v5.40;
use FindBin;
use lib "$FindBin::Bin/lib";
use Plack::Builder;
use Isuride::Web;
use File::Basename;

my $root_dir = File::Basename::dirname(__FILE__);

my $app = Isuride::Web->psgi($root_dir);

builder {

    $app;
};
