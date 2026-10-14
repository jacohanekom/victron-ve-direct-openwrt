/* Adds a "Victron VE.Direct" section to LuCI's Status -> Overview
 * page. Auto-discovered by luci-mod-status's view/status/index.js,
 * which lists view/status/include/*.js sorted by filename and
 * requires each one -- no menu entry or extra wiring needed here.
 */

'use strict';
'require baseclass';
'require rpc';

const callStatus = rpc.declare({
	object: 'luci.victron-ve-direct',
	method: 'status'
});

const LABELS = {
	device: _('Device'),
	pid: _('Product ID'),
	serial: _('Serial'),
	V: _('Battery voltage (V)'),
	I: _('Battery current (A)'),
	VPV: _('Panel voltage (V)'),
	PPV: _('Panel power (W)'),
	CS_name: _('Charge state'),
	ERR_name: _('Error'),
	LOAD: _('Load output'),
	SOC: _('State of charge (%)')
};

const ORDER = ['device', 'serial', 'V', 'I', 'VPV', 'PPV', 'CS_name', 'ERR_name', 'LOAD', 'SOC'];

return baseclass.extend({
	title: _('Victron VE.Direct'),

	load: function() {
		return L.resolveDefault(callStatus(), { ok: 'false' });
	},

	render: function(status) {
		// Hide the whole section rather than show an empty/broken
		// table -- e.g. the daemon isn't running yet, or hasn't seen
		// a frame from the device yet.
		if (!status || (status.ok !== 'true' && status.ok !== true))
			return null;

		const rows = ORDER.filter(function(k) {
			return status[k] != null && status[k] !== '';
		});

		if (!rows.length)
			return null;

		const table = E('table', { 'class': 'table' });

		rows.forEach(function(k) {
			table.appendChild(E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td left', 'width': '33%' }, [LABELS[k] || k]),
				E('td', { 'class': 'td left' }, [String(status[k])])
			]));
		});

		return table;
	}
});
