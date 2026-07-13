import {
  Laptop, Monitor, Keyboard, Camera, Mic, Lightbulb, Home, Gamepad2,
  Headphones, Briefcase, Plane, Speaker, BatteryCharging,
} from 'lucide-react';
import type { ComponentType } from 'react';

// Shared AI Collections data — used by the landing showcase and the dedicated
// collection page. Each slot's `q` is a keyword the collection page uses to
// pull a matching product from the live catalog.
export interface Collection {
  key: string;
  emoji: string;
  title: string;
  sub: string;
  from: string;
  grad: string;
  icons: ComponentType<{ className?: string }>[];
  slots: { label: string; q: string }[];
  feature?: boolean;
}

export const COLLECTIONS: Collection[] = [
  {
    key: 'home-office', emoji: '🧳', title: 'The Perfect Home Office',
    sub: 'Laptop, monitor, chair, keyboard and webcam that just work together.',
    from: '1,200', grad: 'from-blue-500 to-cyan-500', icons: [Laptop, Monitor, Keyboard, Camera], feature: true,
    slots: [{ label: 'Laptop', q: 'laptop' }, { label: 'Monitor', q: 'monitor' }, { label: 'Office chair', q: 'chair' }, { label: 'Keyboard', q: 'keyboard' }, { label: 'Webcam', q: 'webcam' }],
  },
  {
    key: 'creator-studio', emoji: '🎥', title: 'Creator Studio Under €2,000',
    sub: 'Camera, mic, lights and an editing machine for pro-grade content.',
    from: '1,800', grad: 'from-violet-500 to-purple-600', icons: [Camera, Mic, Lightbulb, Laptop],
    slots: [{ label: 'Camera', q: 'camera' }, { label: 'Microphone', q: 'microphone' }, { label: 'Light', q: 'light' }, { label: 'Editing laptop', q: 'laptop' }],
  },
  {
    key: 'smart-home', emoji: '🏡', title: 'Smart Home Essentials',
    sub: 'Hub, smart lighting, cameras and a speaker to automate your home.',
    from: '320', grad: 'from-emerald-500 to-green-600', icons: [Home, Lightbulb, Camera, Speaker],
    slots: [{ label: 'Smart hub', q: 'smart' }, { label: 'Smart bulb', q: 'bulb' }, { label: 'Security camera', q: 'camera' }, { label: 'Speaker', q: 'speaker' }],
  },
  {
    key: 'gaming-setup', emoji: '🎮', title: 'Ultimate Gaming Setup',
    sub: 'A GPU rig, high-refresh monitor, chair and headset built to win.',
    from: '2,400', grad: 'from-rose-500 to-pink-600', icons: [Gamepad2, Monitor, Headphones, Keyboard],
    slots: [{ label: 'Gaming PC', q: 'gaming' }, { label: 'Monitor', q: 'monitor' }, { label: 'Chair', q: 'chair' }, { label: 'Headset', q: 'headset' }],
  },
  {
    key: 'travel-pro', emoji: '✈️', title: 'Travel Like a Pro',
    sub: 'Luggage, noise-cancelling headphones, a power bank and adapters.',
    from: '450', grad: 'from-amber-500 to-orange-600', icons: [Briefcase, Headphones, Plane, BatteryCharging],
    slots: [{ label: 'Luggage', q: 'luggage' }, { label: 'Headphones', q: 'headphones' }, { label: 'Power bank', q: 'power bank' }, { label: 'Adapter', q: 'adapter' }],
  },
];
