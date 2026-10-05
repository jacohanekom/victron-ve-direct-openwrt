include $(TOPDIR)/rules.mk

PKG_NAME:=victron-ve-direct
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

PKG_MAINTAINER:=Jaco Hanekom <jhanekom@gmail.com>
PKG_LICENSE:=custom

include $(INCLUDE_DIR)/package.mk

define Package/victron-ve-direct
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Victron Energy VE.Direct USB telemetry publisher
  URL:=https://github.com/jacohanekom/victron-ve-direct-openwrt
  # kmod-usb-serial-{ftdi,cp210x}: OpenWrt ships no USB-serial chip
  # drivers by default, so without these the kernel never creates a
  # /dev/ttyUSB* node for the cable at all ("open(/dev/ttyUSB0): No
  # such file or directory" even though the cable is plugged in).
  # Victron VE.Direct cables use either an FTDI FT232R or a SiLabs
  # CP210x chip, so both are pulled in rather than guessing which.
  DEPENDS:=+libavahi-client +libuci +libstdcpp +libpthread \
	+kmod-usb-serial-ftdi +kmod-usb-serial-cp210x
endef

define Package/victron-ve-direct/description
  Reads a Victron Energy device (SmartSolar/BlueSolar MPPT, BMV battery
  monitor, Phoenix Inverter) over the VE.Direct serial-text protocol via
  a USB-to-serial adapter, and broadcasts one JSON telemetry line per
  frame over TCP. Also exposes a control port for reading/writing the
  same device settings VictronConnect does, and announces both ports
  on the LAN via mDNS/DNS-SD (Avahi) when available. Configured via
  /etc/config/victron-ve-direct.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	$(CP) ./src/* $(PKG_BUILD_DIR)/
endef

define Build/Compile
	$(TARGET_CXX) $(TARGET_CXXFLAGS) -std=c++20 -Wall -Wextra -O2 -pthread \
		$(TARGET_CPPFLAGS) \
		-o $(PKG_BUILD_DIR)/victron_ve_direct $(PKG_BUILD_DIR)/victron_ve_direct.cpp \
		$(TARGET_LDFLAGS) -lavahi-client -lavahi-common -luci
endef

define Package/victron-ve-direct/conffiles
/etc/config/victron-ve-direct
endef

define Package/victron-ve-direct/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/victron_ve_direct $(1)/usr/bin/victron_ve_direct

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/victron-ve-direct.init $(1)/etc/init.d/victron-ve-direct

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/victron-ve-direct.config $(1)/etc/config/victron-ve-direct
endef

$(eval $(call BuildPackage,victron-ve-direct))
