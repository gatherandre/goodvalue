const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.symbolicator ??= {};
config.symbolicator.customizeFrame = (frame) => {
  if (frame.file && frame.file.endsWith('InternalBytecode.js')) {
    return { ...frame, collapse: true };
  }
  return frame;
};

module.exports = config;
