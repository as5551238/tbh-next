import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';
import {
  fetchMembers, fetchNotifications, fetchReports, fetchApprovals,
  fetchAnnouncements, fetchMeetings, fetchCollabDocs, fetchSharedFiles,
  fetchContacts, fetchActivities, fetchOrgInfo, fetchRoles, fetchComments,
  createMember, updateMember, deleteMember,
  createAnnouncement, updateAnnouncement, deleteAnnouncement,
  createMeeting, updateMeeting, deleteMeeting,
  createSharedFile, updateSharedFile, deleteSharedFile,
  createContact, updateContact, deleteContact,
  createCollabDoc, updateCollabDoc, deleteCollabDoc,
  updateApproval, createApproval, deleteApproval,
  createNotification,
  createReport, updateReport, deleteReport,
  createRole, updateRole, deleteRole,
  saveOrgInfo,
  createActivity,
  createComment, deleteComment,
  type ActivityRow, type CommentRow,
} from '@/lib/dataLayer';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export function useMembers() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchMembers().then((d) => { setMembers(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addMember = useCallback(async (data: Omit<MemberRow, 'id'>) => {
    const row = await createMember(data);
    setMembers((prev) => [row, ...prev]);
    return row;
  }, []);

  const editMember = useCallback(async (id: string, data: Partial<Omit<MemberRow, 'id'>>) => {
    const row = await updateMember(id, data);
    setMembers((prev) => prev.map((m) => m.id === id ? row : m));
    return row;
  }, []);

  const removeMember = useCallback(async (id: string) => {
    await deleteMember(id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { members, setMembers, loading, addMember, editMember, removeMember };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchNotifications().then((d) => { setNotifications(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addNotification = useCallback(async (data: Omit<NotificationRow, 'id' | 'created_at' | 'read' | 'team_id'>) => {
    const tempId = `notif-${Date.now()}`;
    const tempRow: NotificationRow = {
      id: tempId,
      ...data,
      read: false,
      team_id: '__default__',
      created_at: new Date().toISOString(),
      source: data.related_type ?? '系统',
      time: '刚刚',
    };
    setNotifications((prev) => [tempRow, ...prev]);
    const dbRow = await createNotification(data);
    if (dbRow) {
      setNotifications((prev) => prev.map((n) => n.id === tempId ? { ...dbRow, source: dbRow.related_type ?? '系统', time: dbRow.created_at ? new Date(dbRow.created_at).toLocaleString('zh-CN') : '' } : n));
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    try {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('notifications').update({ read: true }).eq('id', id);
      }
    } catch { /* optimistic */ }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('notifications').update({ read: true }).neq('read', true);
      }
    } catch { /* optimistic */ }
  }, []);

  const removeNotification = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('notifications').delete().eq('id', id);
      }
    } catch { /* optimistic */ }
  }, []);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    try {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('notifications').delete().neq('id', '__never__');
      }
    } catch { /* optimistic */ }
  }, []);

  return { notifications, setNotifications, loading, addNotification, markRead, markAllRead, removeNotification, clearAll };
}

export function useReports() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchReports().then((d) => { setReports(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addReport = useCallback(async (data: Partial<ReportRow>) => {
    const row = await createReport(data as Record<string, unknown>);
    setReports((prev) => [row, ...prev]);
    return row;
  }, []);

  const editReport = useCallback(async (id: string, data: Partial<ReportRow>) => {
    const row = await updateReport(id, data as Record<string, unknown>);
    setReports((prev) => prev.map((r) => r.id === id ? row : r));
    return row;
  }, []);

  const removeReport = useCallback(async (id: string) => {
    await deleteReport(id);
    setReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { reports, setReports, loading, addReport, editReport, removeReport };
}

export function useApprovals() {
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchApprovals().then((d) => { setApprovals(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const editApproval = useCallback(async (id: string, data: Partial<ApprovalRow>) => {
    const row = await updateApproval(id, data);
    setApprovals((prev) => prev.map((a) => a.id === id ? row : a));
    return row;
  }, []);

  const addApproval = useCallback(async (data: Partial<ApprovalRow>) => {
    const id = `appr-${Date.now()}`;
    const row = { id, ...data } as ApprovalRow;
    setApprovals((prev) => [row, ...prev]);
    try { await createApproval(data as Record<string, unknown>); } catch { /* optimistic */ }
    return row;
  }, []);

  const removeApproval = useCallback(async (id: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    try { await deleteApproval(id); } catch { /* optimistic */ }
  }, []);

  return { approvals, loading, editApproval, addApproval, removeApproval };
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchAnnouncements().then((d) => { setAnnouncements(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addAnnouncement = useCallback(async (data: Partial<AnnouncementRow>) => {
    const id = `ann-${Date.now()}`;
    const row = { id, ...data } as AnnouncementRow;
    setAnnouncements((prev) => [row, ...prev]);
    try { await createAnnouncement(data as Record<string, unknown>); } catch { /* optimistic */ }
    return row;
  }, []);

  const editAnnouncement = useCallback(async (id: string, data: Partial<AnnouncementRow>) => {
    setAnnouncements((prev) => prev.map((a) => a.id === id ? { ...a, ...data } : a));
    try { await updateAnnouncement(id, data as Record<string, unknown>); } catch { /* optimistic */ }
  }, []);

  const removeAnnouncement = useCallback(async (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    try { await deleteAnnouncement(id); } catch { /* optimistic */ }
  }, []);

  return { announcements, setAnnouncements, loading, addAnnouncement, editAnnouncement, removeAnnouncement };
}

export function useMeetings() {
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchMeetings().then((d) => { setMeetings(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addMeeting = useCallback(async (data: Partial<MeetingRow>) => {
    const id = `mtg-${Date.now()}`;
    const row = { id, ...data } as MeetingRow;
    setMeetings((prev) => [row, ...prev]);
    try { await createMeeting(data as Record<string, unknown>); } catch { /* optimistic */ }
    return row;
  }, []);

  const editMeeting = useCallback(async (id: string, data: Partial<MeetingRow>) => {
    setMeetings((prev) => prev.map((m) => m.id === id ? { ...m, ...data } : m));
    try { await updateMeeting(id, data as Record<string, unknown>); } catch { /* optimistic */ }
  }, []);

  const removeMeeting = useCallback(async (id: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    try { await deleteMeeting(id); } catch { /* optimistic */ }
  }, []);

  return { meetings, setMeetings, loading, addMeeting, editMeeting, removeMeeting };
}

export function useCollabDocs() {
  const [docs, setDocs] = useState<CollabDocRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchCollabDocs().then((d) => { setDocs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addDoc = useCallback(async (data: Partial<CollabDocRow>) => {
    const id = `cdoc-${Date.now()}`;
    const row = { id, ...data } as CollabDocRow;
    setDocs((prev) => [row, ...prev]);
    try { await createCollabDoc(data as Record<string, unknown>); } catch { /* optimistic */ }
    return row;
  }, []);

  const editDoc = useCallback(async (id: string, data: Partial<CollabDocRow>) => {
    setDocs((prev) => prev.map((d) => d.id === id ? { ...d, ...data } : d));
    try { await updateCollabDoc(id, data as Record<string, unknown>); } catch { /* optimistic */ }
  }, []);

  const removeDoc = useCallback(async (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    try { await deleteCollabDoc(id); } catch { /* optimistic */ }
  }, []);

  return { docs, setDocs, loading, addDoc, editDoc, removeDoc };
}

export function useSharedFiles() {
  const [files, setFiles] = useState<SharedFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchSharedFiles().then((d) => { setFiles(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addFile = useCallback(async (data: Partial<SharedFileRow>) => {
    const id = `file-${Date.now()}`;
    const row = { id, ...data } as SharedFileRow;
    setFiles((prev) => [row, ...prev]);
    try { await createSharedFile(data as Record<string, unknown>); } catch { /* optimistic */ }
    return row;
  }, []);

  const editFile = useCallback(async (id: string, data: Partial<SharedFileRow>) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, ...data } : f));
    try { await updateSharedFile(id, data as Record<string, unknown>); } catch { /* optimistic */ }
  }, []);

  const removeFile = useCallback(async (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    try { await deleteSharedFile(id); } catch { /* optimistic */ }
  }, []);

  return { files, setFiles, loading, addFile, editFile, removeFile };
}

export function useContacts() {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchContacts().then((d) => { setContacts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addContact = useCallback(async (data: Partial<ContactRow>) => {
    const id = `con-${Date.now()}`;
    const row = { id, ...data } as ContactRow;
    setContacts((prev) => [row, ...prev]);
    try { await createContact(data as Record<string, unknown>); } catch { /* optimistic */ }
    return row;
  }, []);

  const editContact = useCallback(async (id: string, data: Partial<ContactRow>) => {
    setContacts((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c));
    try { await updateContact(id, data as Record<string, unknown>); } catch { /* optimistic */ }
  }, []);

  const removeContact = useCallback(async (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    try { await deleteContact(id); } catch { /* optimistic */ }
  }, []);

  return { contacts, setContacts, loading, addContact, editContact, removeContact };
}

export function useActivities() {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchActivities().then((d) => { setActivities(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const addActivity = useCallback(async (data: Omit<ActivityRow, 'id' | 'created_at'>) => {
    const row = await createActivity(data);
    setActivities((prev) => [row, ...prev]);
    return row;
  }, []);
  return { activities, setActivities, loading, addActivity };
}

export function useOrgInfo() {
  const [orgInfo, setOrgInfo] = useState<OrgInfoRow | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchOrgInfo().then((d) => { setOrgInfo(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const save = useCallback(async (data: Partial<OrgInfoRow>) => {
    setOrgInfo((prev) => prev ? { ...prev, ...data } : data as OrgInfoRow);
    try { await saveOrgInfo(data); } catch { /* optimistic */ }
  }, []);

  return { orgInfo, setOrgInfo, loading, save };
}

export function useRoles() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchRoles().then((d) => { setRoles(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addRole = useCallback(async (data: Partial<RoleRow>) => {
    const row = await createRole(data as Record<string, unknown>);
    setRoles((prev) => [row, ...prev]);
    return row;
  }, []);

  const editRole = useCallback(async (id: string, data: Partial<RoleRow>) => {
    const row = await updateRole(id, data as Record<string, unknown>);
    setRoles((prev) => prev.map((r) => r.id === id ? row : r));
    return row;
  }, []);

  const removeRole = useCallback(async (id: string) => {
    await deleteRole(id);
    setRoles((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { roles, setRoles, loading, addRole, editRole, removeRole };
}

export function useComments(targetType?: string, targetId?: string) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchComments(targetType, targetId).then((d) => { setComments(d); setLoading(false); }).catch(() => setLoading(false));
  }, [targetType, targetId]);
  const addComment = useCallback(async (data: Omit<CommentRow, 'id' | 'created_at' | 'updated_at'>) => {
    const row = await createComment(data);
    setComments((prev) => [...prev, row]);
    return row;
  }, []);
  const removeComment = useCallback(async (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
    try { await deleteComment(id); } catch { /* optimistic */ }
  }, []);
  return { comments, setComments, loading, addComment, removeComment };
}
