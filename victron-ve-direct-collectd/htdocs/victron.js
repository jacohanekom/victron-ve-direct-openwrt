/* luci-app-statistics graph definition for the "victron" collectd
 * plugin -- fed by victron-collectd-exec via collectd's exec plugin.
 * Installed into luci-app-statistics' own resource tree (a plugin
 * without a matching definitions/<name>.js here is silently skipped
 * on the Graphs page, even if its RRD data exists on disk).
 */

'use strict';
'require baseclass';

return baseclass.extend({
	title: _('Victron VE.Direct'),

	rrdargs(graph, host, plugin, plugin_instance, dtype) {
		return [
			{
				title: '%H: Victron Voltage',
				vlabel: 'V',
				number_format: '%5.2lf V',
				data: {
					types: ['voltage'],
					options: {
						voltage_battery_value: { title: 'Battery', color: '0000ff' },
						voltage_panel_value: { title: 'Panel', color: 'ff8800' }
					}
				}
			},
			{
				title: '%H: Victron Battery Current',
				vlabel: 'A',
				number_format: '%5.2lf A',
				data: {
					types: ['current'],
					options: {
						current_battery_value: { title: 'Battery current' }
					}
				}
			},
			{
				title: '%H: Victron Panel Power',
				vlabel: 'W',
				number_format: '%5.0lf W',
				data: {
					types: ['power'],
					options: {
						power_panel_value: { title: 'Panel power' }
					}
				}
			},
			{
				title: '%H: Victron State of Charge',
				vlabel: '%',
				y_min: '0',
				y_max: '100',
				number_format: '%5.1lf %%',
				data: {
					types: ['percent'],
					options: {
						percent_soc_value: { title: 'State of charge' }
					}
				}
			},
			{
				title: '%H: Victron Time to Go',
				vlabel: 'hours',
				number_format: '%5.1lf h',
				data: {
					types: ['duration'],
					sources: {
						duration: ['seconds']
					},
					options: {
						duration_ttg_seconds: { title: 'Time to go', transform_rpn: '3600,/' }
					}
				}
			},
			{
				title: '%H: Victron Yield Today',
				vlabel: 'kWh',
				number_format: '%5.2lf kWh',
				data: {
					types: ['energy'],
					options: {
						energy_yield_today_value: { title: 'Yield today' }
					}
				}
			}
		];
	}
});
