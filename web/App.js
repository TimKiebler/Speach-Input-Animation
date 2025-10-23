import React from 'react';
import Orb from './Orb.js';
import Hex from './Hex.js';

const ToggleButton = ({ label, active, onPress }) =>
  React.createElement(
    'button',
    {
      className: `toggle-button${active ? ' toggle-button--active' : ''}`,
      onClick: onPress,
      type: 'button',
    },
    label,
  );

export default function App() {
  const [mode, setMode] = React.useState('hex');
  const [resolution, setResolution] = React.useState({ width: 0, height: 0, dpr: 1 });
  const handleResolution = React.useCallback((info) => {
    setResolution(info);
  }, []);
  const resolutionLabel =
    resolution.width && resolution.height
      ? `${resolution.width} × ${resolution.height} @ ${resolution.dpr.toFixed(2)}x`
      : '';
  const ActiveComponent = mode === 'orb' ? Orb : Hex;

  return React.createElement(
    'div',
    { className: 'scene' },
    resolutionLabel
      ? React.createElement('div', { className: 'meta' }, `Resolution: ${resolutionLabel}`)
      : null,
    React.createElement(
      'div',
      { className: 'toggle-bar' },
      React.createElement(ToggleButton, {
        key: 'orb',
        label: 'Circle',
        active: mode === 'orb',
        onPress: () => setMode('orb'),
      }),
      React.createElement(ToggleButton, {
        key: 'hex',
        label: 'Hexagon',
        active: mode === 'hex',
        onPress: () => setMode('hex'),
      }),
    ),
    React.createElement(
      'div',
      { className: 'gl-wrapper' },
      React.createElement(ActiveComponent, {
        key: mode,
        hue: 0,
        hoverIntensity: 1,
        rotateOnHover: true,
        onResolutionChange: handleResolution,
      }),
    ),
    React.createElement('div', { className: 'noise-layer', 'aria-hidden': 'true' }),
    React.createElement(
      'span',
      { className: 'hint' },
      React.createElement('span', { className: 'hint-dot', 'aria-hidden': 'true' }),
      React.createElement('span', { className: 'hint-line', 'aria-hidden': 'true' }),
      `Move across the ${mode === 'orb' ? 'orb' : 'hexagon'}`,
    ),
  );
}
