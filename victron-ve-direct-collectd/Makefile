include $(TOPDIR)/rules.mk

PKG_NAME:=victron-ve-direct-collectd
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

PKG_MAINTAINER:=Jaco Hanekom <jhanekom@gmail.com>
PKG_LICENSE:=custom

include $(INCLUDE_DIR)/package.mk

define Package/victron-ve-direct-collectd
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Historical graphing for victron-ve-direct via collectd/RRD
  URL:=https://github.com/jacohanekom/victron-ve-direct-openwrt
  # luci-app-statistics already pulls in collectd, rrdtool1, and
  # collectd-mod-rrdtool -- only collectd-mod-exec (the input side)
  # needs to be added explicitly here.
  DEPENDS:=+victron-ve-direct +luci-app-statistics +collectd-mod-exec
endef

define Package/victron-ve-direct-collectd/description
  Feeds victron-ve-direct's telemetry (battery/panel voltage, current,
  panel power, state of charge, time to go, yield today) into collectd
  via its exec plugin, so luci-app-statistics graphs and retains
  history for it under Statistics -> Graphs. Registers itself with
  collectd automatically on install via /etc/uci-defaults -- no manual
  Statistics -> Setup steps needed.
endef

# Files-only package: nothing to fetch or build.
define Build/Compile
endef

define Package/victron-ve-direct-collectd/install
	$(INSTALL_DIR) $(1)/usr/libexec
	$(INSTALL_BIN) ./files/victron-collectd-exec $(1)/usr/libexec/victron-collectd-exec

	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/victron-collectd.uci-defaults $(1)/etc/uci-defaults/50-victron-ve-direct-collectd

	$(INSTALL_DIR) $(1)/www/luci-static/resources/statistics/rrdtool/definitions
	$(INSTALL_DATA) ./htdocs/victron.js $(1)/www/luci-static/resources/statistics/rrdtool/definitions/victron.js
endef

$(eval $(call BuildPackage,victron-ve-direct-collectd))
