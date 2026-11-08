# Réseau (Network)

Your connection at a glance: a test that measures your router, the internet, DNS and the League of Legends (EUW) servers and tells you where the problem comes from if there is one, and the list of Wi-Fi networks saved on your PC with their passwords.

*Version française : [README.md](README.md)*

## Test my connection

The test takes about fifteen seconds. It measures:

- **Your router**: the ping to your router (the first hop on the way), over 8 tries;
- **Internet**: the ping to a public server (1.1.1.1), over 8 tries;
- **LoL · EUW**: the ping to the entrance of Riot Games' network in Western Europe, over 12 tries;
- **DNS**: the time to find a site's address.

For each: average, minimum and maximum ping, **jitter** (the variation from one try to the next) and **loss** (tries with no answer).

A sentence then sums up the situation: all good, your router responds poorly (this PC's cable or Wi-Fi), the router responds but not the internet (router or provider), the internet works but not DNS (sites will not open), unstable connection to LoL (expect lag), or slow Wi-Fi between the PC and the router (a cable would do better).

Riot's game servers do not answer pings: Réseau measures Riot's first router, just in front of them. The real in-game ping is a few milliseconds higher.

## Saved Wi-Fi

The list of Wi-Fi networks your PC knows, with their security type.

- **Show**: reads and shows the network's password. It is only read at that moment.
- **Copy**: copies the password to the clipboard.
- **Hide**: hides it again.

Handy for connecting a phone or another PC to the same Wi-Fi.

## Permission

The plugin needs the **system pane** permission to run the measurements and read Windows' Wi-Fi networks; without it, it says so and shows where to grant it (Permissions).

## Data and sync

Nothing is synced and nothing is kept: measurements and passwords are read on your PC when you ask for them.

## Install

In NeoDex: **NeoStore → Discover → Réseau → Install**.

Building a plugin: see the [NeoDex SDK](https://github.com/NDesumeur/neodex-sdk).
