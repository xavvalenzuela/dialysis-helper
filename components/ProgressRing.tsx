import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export default function ProgressRing({ progress, size = 180, strokeWidth = 18, label, sublabel }: Props) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const offset = circ * (1 - clamped);
  const color = progress >= 1 ? '#ef4444' : progress >= 0.75 ? '#f97316' : '#0284c7';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#bae6fd" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        {label ? <Text style={{ fontSize: 17, fontWeight: '700', color: '#334155' }}>{label}</Text> : null}
        {sublabel ? <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}
