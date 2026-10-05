'use strict';
'require dom';
'require form';
'require poll';
'require rpc';
'require view';

const callStatus = rpc.declare({
	object: 'luci.victron-ve-direct',
	method: 'status'
});

const STATUS_LABELS = {
	device: _('Device'),
	pid: _('Product ID'),
	serial: _('Serial'),
	fw: _('Firmware'),
	port: _('Serial port'),
	frame: _('Frames received'),
	fps: _('Frames/sec'),
	V: _('Battery voltage (V)'),
	I: _('Battery current (A)'),
	VPV: _('Panel voltage (V)'),
	PPV: _('Panel power (W)'),
	CS_name: _('Charge state'),
	ERR_name: _('Error'),
	LOAD: _('Load output'),
	H20: _('Yield today (kWh)'),
	SOC: _('State of charge (%)'),
	TTG: _('Time to go (min)')
};

const STATUS_ORDER = [
	'device', 'pid', 'serial', 'fw', 'port', 'frame', 'fps',
	'V', 'I', 'VPV', 'PPV', 'CS_name', 'ERR_name', 'LOAD', 'H20', 'SOC', 'TTG'
];

return view.extend({
	load: function() {
		return L.resolveDefault(callStatus(), { ok: 'false', error: _('Not queried yet.') });
	},

	render: function(status) {
		let m, s, o;

		m = new form.Map('victron-ve-direct', _('Victron VE.Direct'),
			_('Reads a Victron Energy device (SmartSolar/BlueSolar MPPT, BMV battery ' +
			  'monitor, Phoenix Inverter) over USB and publishes telemetry and settings ' +
			  'over TCP. Changes below require Save & Apply (restarts the daemon).'));

		s = m.section(form.NamedSection, 'device', 'device', _('Device'));

		o = s.option(form.Value, 'port', _('Serial port'));
		o.placeholder = '/dev/ttyUSB0';
		o.rmempty = false;

		o = s.option(form.Value, 'baud', _('Baud rate'));
		o.datatype = 'uinteger';
		o.description = _('VE.Direct is always 19200 8N1 -- do not change this.');

		o = s.option(form.Value, 'retry_secs', _('Reconnect delay (seconds)'));
		o.datatype = 'uinteger';

		s = m.section(form.NamedSection, 'output', 'output', _('Network ports'));

		o = s.option(form.Value, 'ctrl_port', _('Control port'),
			_('Status and settings: echo status | nc <ip> <port>'));
		o.datatype = 'port';

		o = s.option(form.Value, 'data_port', _('Data port'),
			_('Live JSON telemetry stream'));
		o.datatype = 'port';

		s = m.section(form.NamedSection, 'control', 'control', _('Control'));

		o = s.option(form.Flag, 'allow_set', _('Allow writing device settings'),
			_('Reads are always allowed regardless of this setting. The control port ' +
			  'listens on 0.0.0.0, so consider disabling this on shared networks.'));

		s = m.section(form.NamedSection, 'mdns', 'mdns', _('mDNS discovery'));

		o = s.option(form.Flag, 'enabled', _('Announce via Avahi'));

		o = s.option(form.Value, 'name', _('Service instance name'));

		const statusNode = E('div', { 'class': 'cbi-section' }, this.renderStatusChildren(status));

		// Refresh just the status block on LuCI's own configured poll
		// interval, without touching (or losing in-progress edits in)
		// the settings form below it.
		poll.add(L.bind(function() {
			return callStatus().then(L.bind(function(newStatus) {
				dom.content(statusNode, this.renderStatusChildren(newStatus));
			}, this));
		}, this));

		return m.render().then(L.bind(function(mapNode) {
			return E('div', {}, [ statusNode, mapNode ]);
		}, this));
	},

	renderStatusChildren: function(status) {
		const ok = status && (status.ok === 'true' || status.ok === true);

		const rows = STATUS_ORDER
			.filter(function(k) { return status && status[k] != null && status[k] !== ''; })
			.map(function(k) {
				return E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td left', 'width': '33%' }, STATUS_LABELS[k] || k),
					E('td', { 'class': 'td left' }, String(status[k]))
				]);
			});

		return [
			E('h3', {}, _('Live status')),
			ok
				? E('table', { 'class': 'table' }, rows)
				: E('p', {}, (status && status.error) || _('No data yet.'))
		];
	}
});
