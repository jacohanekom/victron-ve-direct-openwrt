# victron-ve-direct-openwrt

OpenWrt packaging of the [victron_ve_direct](https://github.com/jacohanekom/victron_ve_direct)
daemon, plus a LuCI web UI. Reads a Victron Energy device over the
VE.Direct serial-text protocol (USB-to-serial dongle) and broadcasts one
JSON telemetry line per frame over TCP, with a control port for reading
and writing the same settings VictronConnect exposes -- same protocol as
the [Debian/systemd](https://github.com/jacohanekom/victron_ve_direct)
and [Alpine/OpenRC](https://github.com/jacohanekom/victron-ve-direct-alpine)
siblings. The only real difference is config format: this port uses
[UCI](https://openwrt.org/docs/guide-user/base-system/uci)
(`/etc/config/victron-ve-direct`) instead of the flat `config.ini` the
other two use, so it's editable from LuCI and `uci`/`uci-defaults` like
any other OpenWrt service.

Unlike [pi-relay-control-openwrt](https://github.com/jacohanekom/pi-relay-control-openwrt),
nothing here needs vendoring from source: `avahi-client` (for mDNS/DNS-SD
announcement) is a normal, working OpenWrt `packages` feed package, so
this port is a straight recompile against OpenWrt's own libraries.

## Supported devices

- **SmartSolar MPPT** -- full range (75|10 through 250|100)
- **BlueSolar MPPT** -- full range (75|10 through 150|100)
- **BMV battery monitors** -- BMV-700, BMV-702, BMV-700H, BMV-712 Smart
- **Phoenix Inverter** -- 12/24/48V, 250 VA through 1200 VA
- Any other VE.Direct device -- raw fields are still emitted

This repo holds three packages, meant to be added as a custom feed
rather than built standalone:

- `victron-ve-direct` -- the daemon, init script, and default UCI config.
- `luci-app-victron-ve-direct` -- a LuCI page (`Services -> Victron
  VE.Direct`) that shows live telemetry and edits the UCI config.
- `victron-ve-direct-collectd` (optional) -- feeds telemetry into
  collectd so `luci-app-statistics` graphs and retains history for it.
  Not installed by default: `collectd` + `rrdtool` + `luci-app-statistics`
  is a fairly heavy dependency chain for a flash-constrained router, so
  this stays opt-in rather than bundled into the LuCI app above.

## Requirements

- An OpenWrt target with a free USB port
- A VE.Direct USB-to-serial cable (FTDI FT232R or SiLabs CP210x) -- the
  `victron-ve-direct` package pulls in both `kmod-usb-serial-ftdi` and
  `kmod-usb-serial-cp210x` automatically, since OpenWrt ships no
  USB-serial chip drivers by default (without one, the kernel never
  creates a `/dev/ttyUSB*` node for the cable at all)
- The `luci` feed enabled (default in `feeds.conf.default`) -- needed to
  build `luci-app-victron-ve-direct`, which includes `feeds/luci/luci.mk`

## Building

Add this repo as a custom feed in your OpenWrt buildroot's
`feeds.conf.default` (or `feeds.conf`):

```
src-link victron-ve-direct /path/to/victron-ve-direct-openwrt
```

Then:

```sh
./scripts/feeds update victron-ve-direct
./scripts/feeds install -a -p victron-ve-direct

make menuconfig
# Network  --->  <*> victron-ve-direct
# LuCI  --->  3. Applications  --->  <*> luci-app-victron-ve-direct
# Network  --->  <*> victron-ve-direct-collectd   (optional, see "Historical graphing" below)

make package/victron-ve-direct/compile V=s
make package/luci-app-victron-ve-direct/compile V=s
make package/victron-ve-direct-collectd/compile V=s
```

All `.ipk`s land in `bin/packages/<arch>/victron-ve-direct/`. CI builds
against OpenWrt 24.10.4 (still `opkg`/`.ipk` -- 25.12 switched the
default package format to `apk`), targeting `aarch64_cortex-a53` (Pi
3/4-class boards, this project suite's usual hardware) and `x86_64` as a
fast generic sanity check.

`victron-ve-direct-collectd` is built by a **separate** workflow,
[`build-collectd.yml`](.github/workflows/build-collectd.yml), not the
main one above: it has no compiled code of its own, but depends on
`luci-app-statistics`, which pulls in collectd -- and building
collectd from source drags in a much larger transitive dependency tree
than its own plugin list suggests (curl, neon, mariadb-connector-c,
mosquitto, nut, unbound, libwebsockets...), taking 60-90+ minutes.
Running that on every push would slow down and risk the main (fast,
reliable) build, so `build-collectd.yml` only runs when files under
`victron-ve-direct-collectd/` change, on `v*` tags, or on demand
(Actions tab -> "Build collectd package" -> "Run workflow"). Grab the
resulting `.ipk` from that workflow run's artifacts, or from a tagged
release.

## Configuration

Edit `/etc/config/victron-ve-direct` (or use LuCI's `Services -> Victron
VE.Direct` page):

```
config device 'device'
	option port        '/dev/ttyUSB0'
	option baud        '19200'
	option retry_secs  '5'

config output 'output'
	option ctrl_port '8562'
	option data_port '8563'

config control 'control'
	option allow_set '1'

config mdns 'mdns'
	option enabled '1'
	option name    'victron-ve-direct'
```

The VE.Direct protocol is always 19200 8N1 -- do not change `baud`.

`allow_set` controls whether device settings can be written over
`ctrl_port` (`set`/`setraw`/`restart`); reads (`status`/`settings`/
`get`/`list`/`ping`) are always allowed. The control port listens on
`0.0.0.0`, so consider disabling writes on shared networks.

Restart after any config change: `/etc/init.d/victron-ve-direct reload`
(LuCI's "Save & Apply" does this automatically via a UCI reload
trigger).

## Usage

```sh
# Stream live telemetry
nc 127.0.0.1 8563

# Query status
echo status | nc 127.0.0.1 8562
```

### Device settings (VictronConnect parameters)

The control port can read and write the same settings VictronConnect
exposes, using the VE.Direct HEX protocol on the same serial line:

| Command | Description |
|---------|-------------|
| `status` | telemetry snapshot |
| `settings` | read every register the connected device supports |
| `list` | show the register catalogue: name, id, type, rw/ro, unit |
| `get <name\|0xRRRR>` | read one register |
| `set <name> <value>` | write one register, value in engineering units |
| `setraw <0xRRRR> <u8\|u16\|s16\|u32\|s32> <int>` | write any register by raw id |
| `ping` | HEX ping, returns app version |
| `restart` | reboot the device |
| `help` | command summary |

```sh
echo 'set absorption_voltage 14.40' | nc 127.0.0.1 8562
```

This is CLI/TCP-only for now -- the LuCI page covers live status and
UCI settings, not a register browser. See the upstream
[victron_ve_direct README](https://github.com/jacohanekom/victron_ve_direct)
for the full command reference and register catalogue; the protocol is
identical here.

## JSON output

One object per VE.Direct frame, emitted on stdout and broadcast to all
connected TCP clients on `data_port`:

```json
{
  "ts_us": 1751200000000000,
  "frame": 42,
  "device": {"pid": "0xA067", "name": "SmartSolar MPPT 100|50", "serial": "HQ2241A3JKL", "fw": "161"},
  "V": 12.540, "I": 0.150, "VPV": 18.200, "PPV": 4,
  "CS": 5, "CS_name": "Float",
  "ERR": 0, "ERR_name": "No error",
  "LOAD": "ON", "IL": 0.150,
  "H19": 123.45, "H20": 0.12, "H21": 45, "H22": 0.98, "H23": 52, "HSDS": 5
}
```

## Discovery (mDNS/DNS-SD)

On startup the daemon announces both TCP ports on the LAN via Avahi:

```sh
avahi-browse -rt _victron-data._tcp
avahi-browse -rt _victron-status._tcp
```

`DEPENDS:=+libavahi-client` on the `victron-ve-direct` package pulls in
`avahi-dbus-daemon` and `dbus` automatically -- OpenWrt's `libavahi-client`
only exists in the D-Bus-enabled variant, so installing this package is
enough to get a working `avahi-daemon`, no separate install step needed.
If Avahi still isn't reachable for some other reason, the daemon logs a
warning at startup and continues normally -- mDNS is discovery-only, not
required for the TCP protocol to work. Disable it or change the
advertised name via the `mdns` UCI section.

## LuCI web UI

`luci-app-victron-ve-direct` adds a `Services -> Victron VE.Direct` page
with:

- A live status table (device identity, voltage/current/power, charge
  state, errors -- whatever the daemon currently has, via a
  `luci.victron-ve-direct` rpcd backend that queries `ctrl_port`
  directly, same as `echo status | nc`), auto-refreshing on LuCI's own
  configured poll interval without disturbing the settings form below it.
- A standard UCI form below it for editing `device`, `output`,
  `control`, and `mdns` settings, which requires Save & Apply (triggers
  an automatic service reload).

The rpcd backend (`/usr/libexec/rpcd/luci.victron-ve-direct`) shells out
to BusyBox `nc` to speak the daemon's TCP protocol, so it needs the `nc`
applet enabled in BusyBox -- the default on stock OpenWrt builds.

## Service management

```sh
/etc/init.d/victron-ve-direct start
/etc/init.d/victron-ve-direct stop
/etc/init.d/victron-ve-direct reload    # re-reads UCI config
/etc/init.d/victron-ve-direct enable    # start on boot
/etc/init.d/victron-ve-direct status
```

Runs under `procd`, which respawns it automatically on failure (5 s
delay, unlimited retries).

## Finding the serial device

OpenWrt's `mdev` doesn't support the VID/PID-matching rules the upstream
Debian package installs for a stable `/dev/victron-serial` symlink, so
point the `device.port` UCI option at the enumerated device directly:

```sh
dmesg | grep -i ttyUSB
# or
ls /dev/ttyUSB* /dev/ttyACM*
```

## Historical graphing

`victron-ve-direct-collectd` is an optional package that feeds
telemetry into [collectd](https://collectd.org/)'s `exec` plugin, so
`luci-app-statistics` graphs and retains history for it under
`Statistics -> Graphs -> victron`. Install the `.ipk` from
[`build-collectd.yml`](.github/workflows/build-collectd.yml) (see
"Building" above) with:

```sh
opkg install victron-ve-direct_*.ipk victron-ve-direct-collectd_*.ipk
```

It graphs:

- Voltage (battery + panel, one graph, two lines)
- Battery current
- Panel power
- State of charge (BMV battery monitors only -- MPPT/inverter don't
  report SOC, so this graph stays empty on those)
- Time to go (BMV only, same caveat)
- Yield today -- resets to 0 daily, so it shows as a sawtooth over
  multi-day timespans; that's expected, not a bug

Charge state and error code are deliberately not graphed -- they're
categorical codes, not meaningful as line charts. They're still
visible on the live status table on the main `victron-ve-direct` LuCI
page.

Installing `victron-ve-direct-collectd` registers itself with collectd
automatically (via `/etc/uci-defaults`, idempotent on reinstall) --
no manual `Statistics -> Setup -> Exec` steps needed. It does this by
adding `collectd_exec` / `collectd_exec_input` sections to
`/etc/config/luci_statistics`, a file owned by `luci-app-statistics`,
not this package -- if you've already customized collectd settings
there, this only adds to it, it doesn't replace the file.

The forwarder (`/usr/libexec/victron-collectd-exec`) is a persistent
script collectd itself starts and keeps running (not a procd service);
it polls `victron-ve-direct`'s `ctrl_port` every 30 seconds and emits
[collectd exec-protocol](https://collectd.org/documentation/manpages/collectd-exec.5.shtml)
`PUTVAL` lines, independent of collectd's own global `Interval`
setting. If you change `output.ctrl_port` in `/etc/config/victron-ve-direct`,
the forwarder picks it up on its next poll without needing a restart.

### Persistence across reboots

`luci-app-statistics`' default RRD location (`DataDir`) is `/tmp/rrd`
-- a RAM-backed `tmpfs`, wiped on every reboot. Without extra setup,
all graphed history (every plugin's, not just victron's) is lost on
restart; that's stock OpenWrt behavior, not specific to this package.

Installing `victron-ve-direct-collectd` fixes this by enabling
`luci-app-statistics`' own existing (but off-by-default) backup/restore
mechanism, rather than reimplementing one:

- `luci_statistics.collectd_rrdtool.backup` is set to `1`. This makes
  `/etc/init.d/luci_statistics` tar up the whole RRD tree to
  `/etc/luci_statistics/rrdbackup.tgz` (on persistent flash, under
  `/etc`) whenever it stops -- which already happens automatically on
  every clean reboot and `sysupgrade` -- and restore it on the next
  boot, before collectd starts.
- An hourly cron job (`/etc/init.d/luci_statistics backup`) is added
  on top, so an unclean crash or power loss only risks up to an hour
  of history, not everything since the last clean reboot.

This backs up the *entire* RRD tree, every collectd plugin's data, not
just victron's -- there's no way to back up a single plugin's subset
via this mechanism. Writing to flash hourly is a deliberate trade-off
between data-loss window and flash wear; adjust or remove the cron
line in `/etc/crontabs/root` if you'd rather tune that balance
differently.
