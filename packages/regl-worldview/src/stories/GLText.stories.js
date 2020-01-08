// @flow

import { storiesOf } from "@storybook/react";
import { quat } from "gl-matrix";
import { range } from "lodash";
import React, { useState, useLayoutEffect } from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import { Axes } from "../commands";
import type { Color } from "../types";
import { vec4ToOrientation } from "../utils/commandUtils";
import Container from "./Container";
import inScreenshotTests from "stories/inScreenshotTests";

import { GLText } from "..";

function textMarkers({
  text,
  billboard,
  background = true,
}: {
  text: string,
  billboard?: ?boolean,
  background?: ?boolean,
}) {
  const radius = 10;
  const count = 10;
  return new Array(count).fill().map((_, i) => {
    const angle = (2 * Math.PI * i) / count;
    const color = { r: 0, g: i / count, b: i / count, a: 1 };
    return {
      text: `${text} ${i}`,
      pose: {
        position: { x: radius * Math.cos(angle), y: radius * Math.sin(angle), z: 0 },
        orientation: vec4ToOrientation(quat.rotateZ(quat.create(), quat.create(), Math.PI / 2 + angle)),
      },
      scale: { x: 1, y: 1, z: 1 },
      color,
      colors: background && i % 4 === 0 ? [color, { r: 1, g: 1, b: 0, a: 1 }] : undefined,
      billboard,
    };
  });
}

function rgbToHex(color: Color) {
  let r = Math.floor(color.r * 255).toString(16),
    g = Math.floor(color.g * 255).toString(16),
    b = Math.floor(color.b * 255).toString(16);

  if (r.length === 1) {
    r = `0${r}`;
  }
  if (g.length === 1) {
    g = `0${g}`;
  }
  if (b.length === 1) {
    b = `0${b}`;
  }

  return `#${r}${g}${b}`;
}

function hexToRgb(hex: string): Color {
  let r = 0,
    g = 0,
    b = 0;

  // 3 digits
  if (hex.length == 4) {
    r = `0x${hex[1]}${hex[1]}`;
    g = `0x${hex[2]}${hex[2]}`;
    b = `0x${hex[3]}${hex[3]}`;

    // 6 digits
  } else if (hex.length == 7) {
    r = `0x${hex[1]}${hex[2]}`;
    g = `0x${hex[3]}${hex[4]}`;
    b = `0x${hex[5]}${hex[6]}`;
  }

  // TIL you can do hexadecimal math with JS strings. WTF. This has
  // to have led to the craziest bug hunts ever conceived.
  r = +(r / 255).toFixed(2);
  g = +(g / 255).toFixed(2);
  b = +(b / 255).toFixed(2);
  return { r, g, b, a: 1 };
}

storiesOf("Worldview/GLText", module)
  .addDecorator(withScreenshot({ delay: 200 }))
  .add("billboard", () => (
    <Container cameraState={{ perspective: true, distance: 40 }}>
      <GLText>{textMarkers({ text: "Hello\nWorldview", billboard: true })}</GLText>
      <Axes />
    </Container>
  ))
  .add("non-billboard", () => (
    <Container cameraState={{ perspective: true, distance: 40 }}>
      <GLText>{textMarkers({ text: "Hello\nWorldview", billboard: false })}</GLText>
      <Axes />
    </Container>
  ))
  .add("no background", () => (
    <Container cameraState={{ perspective: true, distance: 40 }}>
      <GLText>{textMarkers({ text: "Hello\nWorldview", billboard: false, background: false })}</GLText>
      <Axes />
    </Container>
  ))
  .add("autoBackgroundColor", () => (
    <Container cameraState={{ perspective: true, distance: 40 }} backgroundColor={[0.2, 0.2, 0.4, 1]}>
      <GLText autoBackgroundColor>{textMarkers({ text: "Hello\nWorldview" })}</GLText>
      <Axes />
    </Container>
  ))
  .add("changing text", () => {
    function Example() {
      const [text, setText] = useState("Hello\nWorldview");
      useLayoutEffect(() => {
        let i = 0;
        const id = setInterval(() => {
          setText(`New text! ${++i}`);
          if (inScreenshotTests()) {
            clearInterval(id);
          }
        }, 100);
        return () => clearInterval(id);
      }, []);
      return (
        <Container cameraState={{ perspective: true, distance: 40 }} backgroundColor={[0.2, 0.2, 0.4, 1]}>
          <GLText autoBackgroundColor>{textMarkers({ text })}</GLText>
          <Axes />
        </Container>
      );
    }
    return <Example />;
  })
  .add("highlighted text", () => {
    const Example = () => {
      const [searchText, setSearchText] = useState("ello\nW");
      const [highlightColor, setHighlightColor] = useState<Color>({ r: 1, b: 0, g: 1, a: 1 });
      const markers = textMarkers({ text: "Hello\nWorldview" }).map((marker) => {
        if (!searchText) {
          return marker;
        }
        const highlightedIndices = new Set();
        let match;
        let regex;
        try {
          regex = new RegExp(searchText, "ig");
        } catch (e) {
          return marker;
        }
        while ((match = regex.exec(marker.text)) !== null) {
          // $FlowFixMe - Flow doesn't understand the while loop terminating condition.
          range(0, match[0].length).forEach((i) => {
            // $FlowFixMe - Flow doesn't understand the while loop terminating condition.
            highlightedIndices.add(match.index + i);
          });
        }
        return { ...marker, highlightedIndices: Array.from(highlightedIndices), highlightColor };
      });

      return (
        <div style={{ width: "100%", height: "100%" }}>
          <div style={{ width: "100%", height: "100%" }}>
            <Container cameraState={{ perspective: true, distance: 40 }} backgroundColor={[0.2, 0.2, 0.4, 1]}>
              <GLText autoBackgroundColor>{markers}</GLText>
              <Axes />
            </Container>
          </div>
          <div style={{ position: "absolute", top: "10px", right: "10px" }}>
            <label htmlFor="search">Search: </label>
            <input
              type="text"
              name="search"
              placeholder="search text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <label htmlFor="highlight-color">Highlight Color: </label>
            <input
              type="color"
              name="highlight-color"
              value={rgbToHex(highlightColor)}
              onChange={(e) => {
                const hex = e.target.value;
                const newColor = hexToRgb(hex);
                setHighlightColor({ ...newColor, a: 1 });
              }}
            />
          </div>
        </div>
      );
    };

    return <Example />;
  });