package Isuride::Models;
use v5.40;
use utf8;

use Types::Standard -types;

use constant ChairModel => {
    name  => Str,
    speed => Int,
};

use constant Chair => {
    id           => Str,
    owner_id     => Str,
    name         => Str,
    model        => Str,
    is_active    => Bool,
    access_token => Str,
    created_at   => Int,
    updated_at   => Int,
};
