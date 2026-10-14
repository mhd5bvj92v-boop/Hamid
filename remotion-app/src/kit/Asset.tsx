// The user's own 3D / realistic assets (renders of hands, products, planets...)
// inside Remotion. Claude never draws those with code shapes: the user provides
// them (Studio upload or edit_decisions.py asset) and they are copied to
// public/projects/<slug>/assets/, so `src` is a staticFile() path.
//  - images: PNG / WebP with a transparent background (or JPG on a plain one)
//  - videos: WebM with alpha (VP8/VP9) plays transparent; MP4 is opaque.
import React from "react";
import { Img, OffthreadVideo, staticFile } from "remotion";

export const isVideoAsset = (src: string) => /\.(webm|mp4|m4v|mov)$/i.test(src);

export const AssetMedia: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => {
  const url = staticFile(src);
  return isVideoAsset(src) ? (
    <OffthreadVideo src={url} muted transparent={/\.webm$/i.test(src)} style={style} />
  ) : (
    <Img src={url} style={style} />
  );
};
