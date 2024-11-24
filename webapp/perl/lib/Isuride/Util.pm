package Isuride::Util;
use v5.40;
use utf8;

use Exporter 'import';
use Carp qw(croak);

our @EXPORT_OK = qw(
    secure_random_str
    calculate_distance
    calculate_fare
    calculate_sale

    check_params
);

use constant InitialFare     => 500;
use constant FarePerDistance => 100;

use Types::Standard -types;
use Cpanel::JSON::XS::Type;
use Type::Params qw(compile);

use Scalar::Util qw(refaddr);
use Hash::Util qw(lock_hashref);
use Crypt::URandom ();

sub secure_random_str ($byte_length) {
    my $bytes = Crypt::URandom::urandom($byte_length);
    return unpack('H*', $bytes);
}

# マンハッタン距離を求める
sub calculate_distance ($a_latitude, $a_longitude, $b_latitude, $b_longitude) {
    return abs($a_latitude - $b_latitude) + abs($a_longitude - $b_longitude);
}

sub abs ($n) {
    if ($n < 0) {
        return -$n;
    }
    return $n;
}

sub calculate_fare ($pickup_latitude, $pickup_longitude, $dest_latitude, $dest_longitude) {
    my $matered_dare = FarePerDistance * calculate_distance($pickup_latitude, $pickup_longitude, $dest_latitude, $dest_longitude);
    return InitialFare + $matered_dare;
}

sub calculate_sale ($ride) {
    return calculate_fare($ride->{pickup_latitude}, $ride->{pickup_longitude}, $ride->{destination_latitude}, $ride->{destination_longitude});
}

sub _create_type_tiny_type_from_cpanel_type ($cpanel_structure) {
    if (ref $cpanel_structure eq 'HASH') {
        Dict [ map { $_ => _create_type_tiny_type_from_cpanel_type($cpanel_structure->{$_}) } keys $cpanel_structure->%* ];
    }
    elsif (ref $cpanel_structure eq 'ARRAY') {
        ArrayRef [ map { _create_type_tiny_type_from_cpanel_type($_) } $cpanel_structure->@* ];
    }
    elsif ($cpanel_structure isa 'Cpanel::JSON::XS::Type::ArrayOf') {
        ArrayRef [ create_type_tiny_type_from_cpanel_type($cpanel_structure->$*) ];
    }
    elsif ($cpanel_structure eq JSON_TYPE_STRING) {
        Str;
    }
    elsif ($cpanel_structure eq JSON_TYPE_INT) {
        Int;
    }
    else {
        die "Unsupported type: $cpanel_structure";
    }
}

my $compiled_checks = {};
my $compiled        = {};

# 開発環境では、パラメータの型チェックを行う
use constant ASSERT => ($ENV{PLACK_ENV} || '') ne 'deployment';
sub check_params;
*check_params = ASSERT ? \&_check_params : sub { 1 };

sub _check_params ($params, $cpanel_type) {
    my $call_point = join '-', caller;

    unless ($compiled->{$call_point}) {
        my $type  = _create_type_tiny_type_from_cpanel_type($cpanel_type);
        my $check = compile($type);
        $compiled->{$call_point} = { check => $check, type => $type };
    }

    my $co    = $compiled->{$call_point};
    my $type  = $co->{type};
    my $check = $co->{check};

    try {
        my $flag = $check->($params);

        # 開発環境では、存在しないキーにアクセスした時にエラーになるようにしておく
        if (ASSERT && $flag) {
            lock_hashref($params);
        }

        return 1;
    }
    catch ($e) {
        warn("Failed to check params: ", $type->get_message($params));
        warn("Checked params: ",         $params);

        return 0;
    }
}

1;
