import React from "react";
import { Image, StyleSheet, Text, View, ViewStyle } from "react-native";

interface BrandHeaderProps {
  title?: string;
  subtitle?: string;
  containerStyle?: ViewStyle;
}

export function BrandHeader({ title, subtitle, containerStyle }: BrandHeaderProps) {
  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Image
        source={require("../../../assets/brand/logo-horizontal.png")}
        resizeMode="contain"
        style={styles.logo}
      />
      {(title || subtitle) ? (
        <View style={styles.textWrapper}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#CBD5E0",
    marginBottom: 16,
  },
  logo: {
    width: 220,
    height: 96,
  },
  textWrapper: {
    alignItems: "center",
    marginTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A202C",
  },
  subtitle: {
    fontSize: 14,
    color: "#4A5568",
    marginTop: 4,
    textAlign: "center",
  },
});

export default BrandHeader;
