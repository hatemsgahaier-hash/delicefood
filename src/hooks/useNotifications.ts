import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // AudioContext not available
  }
}

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [popup, setPopup] = useState<Notification | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const loadNotifications = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30);
    const notifs = (data as Notification[]) ?? [];
    if (!initialized.current) {
      knownIds.current = new Set(notifs.map((n) => n.id));
      initialized.current = true;
    } else {
      const newOnes = notifs.filter((n) => !knownIds.current.has(n.id));
      if (newOnes.length > 0) {
        playAlertSound();
        setPopup(newOnes[0]);
        setTimeout(() => setPopup(null), 5000);
        newOnes.forEach((n) => knownIds.current.add(n.id));
      }
    }
    setNotifications(notifs);
    setUnreadCount(notifs.filter((n) => !n.is_read).length);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    loadNotifications();

    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, () => loadNotifications())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, loadNotifications]);

  const markAllRead = useCallback(async () => {
    if (!profile) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [profile]);

  return { notifications, unreadCount, showPanel, setShowPanel, popup, markAllRead };
}
