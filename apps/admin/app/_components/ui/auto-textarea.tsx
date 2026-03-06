"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, type TextareaHTMLAttributes } from "react";

function resizeTextarea(node: HTMLTextAreaElement | null) {
  if (!node) return;
  node.style.height = "0px";
  node.style.height = `${node.scrollHeight}px`;
}

export const AutoTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AutoTextarea(props, forwardedRef) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    useImperativeHandle(forwardedRef, () => innerRef.current as HTMLTextAreaElement, []);

    useEffect(() => {
      resizeTextarea(innerRef.current);
    }, [props.value]);

    return (
      <textarea
        {...props}
        ref={innerRef}
        rows={props.rows ?? 3}
        onChange={(event) => {
          resizeTextarea(event.currentTarget);
          props.onChange?.(event);
        }}
      />
    );
  }
);
