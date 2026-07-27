import React, { useEffect, useRef } from 'react';

export function EditableText({
  value,
  onChange,
  className,
  style,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      if (document.activeElement !== ref.current) {
        ref.current.innerHTML = value;
      }
    }
  }, [value]);

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.target.innerHTML !== value) onChange(e.target.innerHTML);
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (e.currentTarget.innerHTML !== value) onChange(e.currentTarget.innerHTML);
  };

  return (
    <div
      ref={ref}
      contentEditable
      className={
        (className ?? '') +
        ' whitespace-pre-wrap outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#bbb] empty:before:italic empty:before:pointer-events-none'
      }
      style={style}
      onBlur={handleBlur}
      onInput={handleInput}
      data-placeholder={placeholder}
    />
  );
}
