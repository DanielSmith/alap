<?php

namespace Database\Seeders;

use App\Models\Config;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Config::updateOrCreate(
            ['name' => 'demo'],
            ['config' => [
                'settings' => [
                    'listType' => 'ul',
                    'menuTimeout' => 5000,
                ],

                'macros' => [
                    'cars' => ['linkItems' => 'vwbug, bmwe36'],
                    'nycbridges' => ['linkItems' => '.nyc + .bridge'],
                ],

                'allLinks' => [
                    'vwbug' => [
                        'label' => 'VW Bug — Wikipedia',
                        'url' => 'https://en.wikipedia.org/wiki/Volkswagen_Beetle',
                        'tags' => ['car', 'vw', 'germany'],
                    ],
                    'bmwe36' => [
                        'label' => 'BMW E36 — Wikipedia',
                        'url' => 'https://en.wikipedia.org/wiki/BMW_3_Series_(E36)',
                        'tags' => ['car', 'bmw', 'germany'],
                    ],
                    'miata' => [
                        'label' => 'Mazda Miata — Wikipedia',
                        'url' => 'https://en.wikipedia.org/wiki/Mazda_MX-5',
                        'tags' => ['car', 'mazda', 'japan'],
                    ],
                    'brooklyn' => [
                        'label' => 'Brooklyn Bridge',
                        'url' => 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
                        'tags' => ['nyc', 'bridge', 'landmark'],
                    ],
                    'manhattan' => [
                        'label' => 'Manhattan Bridge',
                        'url' => 'https://en.wikipedia.org/wiki/Manhattan_Bridge',
                        'tags' => ['nyc', 'bridge'],
                    ],
                    'highline' => [
                        'label' => 'The High Line',
                        'url' => 'https://en.wikipedia.org/wiki/High_Line',
                        'tags' => ['nyc', 'park', 'landmark'],
                    ],
                    'centralpark' => [
                        'label' => 'Central Park',
                        'url' => 'https://en.wikipedia.org/wiki/Central_Park',
                        'tags' => ['nyc', 'park'],
                    ],
                    'goldengate' => [
                        'label' => 'Golden Gate Bridge',
                        'url' => 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
                        'tags' => ['sf', 'bridge', 'landmark'],
                    ],
                    'dolores' => [
                        'label' => 'Dolores Park',
                        'url' => 'https://en.wikipedia.org/wiki/Dolores_Park',
                        'tags' => ['sf', 'park'],
                    ],
                    'aqus' => [
                        'label' => 'Aqus Cafe',
                        'url' => 'https://aqus.com',
                        'tags' => ['coffee', 'sf'],
                    ],
                    'bluebottle' => [
                        'label' => 'Blue Bottle Coffee',
                        'url' => 'https://bluebottlecoffee.com',
                        'tags' => ['coffee', 'sf', 'nyc'],
                    ],
                    'acre' => [
                        'label' => 'Acre Coffee',
                        'url' => 'https://acrecoffee.com',
                        'tags' => ['coffee'],
                    ],
                ],
            ]],
        );

        $this->command->info('Seeded "demo" config.');
    }
}
