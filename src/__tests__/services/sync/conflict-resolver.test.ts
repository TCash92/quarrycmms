/**
 * Tests for conflict-resolver.ts
 *
 * Tests field-level conflict resolution rules and escalation triggers
 * per CMMS_MVP_Design_Guide_v6.md Part 3.
 */

import {
  hasConflict,
  resolveWorkOrderConflict,
  resolveAssetConflict,
  hasMeterReadingConflict,
  resolveMeterReadingConflict,
  resolveWorkOrderPhotoConflict,
} from '@/services/sync/conflict-resolver';

import {
  createMockWorkOrder,
  createMockWorkOrderRow,
  createMockAsset,
  createMockAssetRow,
  createMockMeterReading,
  createMockMeterReadingRow,
  createMockWorkOrderPhotoRow,
  BASE_TIMESTAMP,
  BASE_ISO,
  ONE_HOUR,
  ONE_DAY,
  toISOString,
  resetIdCounter,
  resetTime,
} from '../../helpers/sync-test-helpers';

describe('conflict-resolver', () => {
  beforeEach(() => {
    resetIdCounter();
    resetTime();
  });

  // ============================================================================
  // hasConflict() tests
  // ============================================================================
  describe('hasConflict', () => {
    it('returns false when localSyncStatus is synced', () => {
      const local = createMockWorkOrder({
        localSyncStatus: 'synced',
        serverUpdatedAt: BASE_TIMESTAMP,
      });
      const remoteUpdatedAt = toISOString(BASE_TIMESTAMP + ONE_HOUR);

      expect(hasConflict(local, remoteUpdatedAt)).toBe(false);
    });

    it('returns false when localSyncStatus is conflict', () => {
      const local = createMockWorkOrder({
        localSyncStatus: 'conflict',
        serverUpdatedAt: BASE_TIMESTAMP,
      });
      const remoteUpdatedAt = toISOString(BASE_TIMESTAMP + ONE_HOUR);

      expect(hasConflict(local, remoteUpdatedAt)).toBe(false);
    });

    it('returns false when server is not newer than local serverUpdatedAt', () => {
      const local = createMockWorkOrder({
        localSyncStatus: 'pending',
        serverUpdatedAt: BASE_TIMESTAMP + ONE_HOUR,
      });
      const remoteUpdatedAt = toISOString(BASE_TIMESTAMP); // Server is older

      expect(hasConflict(local, remoteUpdatedAt)).toBe(false);
    });

    it('returns true when local has pending changes AND server is newer', () => {
      const local = createMockWorkOrder({
        localSyncStatus: 'pending',
        serverUpdatedAt: BASE_TIMESTAMP,
      });
      const remoteUpdatedAt = toISOString(BASE_TIMESTAMP + ONE_HOUR); // Server is newer

      expect(hasConflict(local, remoteUpdatedAt)).toBe(true);
    });

    it('returns true when serverUpdatedAt is null and remote has update', () => {
      const local = createMockWorkOrder({
        localSyncStatus: 'pending',
        serverUpdatedAt: null,
      });
      const remoteUpdatedAt = toISOString(BASE_TIMESTAMP);

      expect(hasConflict(local, remoteUpdatedAt)).toBe(true);
    });

    it('returns false when timestamps are equal', () => {
      const local = createMockWorkOrder({
        localSyncStatus: 'pending',
        serverUpdatedAt: BASE_TIMESTAMP,
      });
      const remoteUpdatedAt = toISOString(BASE_TIMESTAMP); // Same timestamp

      expect(hasConflict(local, remoteUpdatedAt)).toBe(false);
    });
  });

  // ============================================================================
  // resolveWorkOrderConflict() tests
  // ============================================================================
  describe('resolveWorkOrderConflict', () => {
    describe('no conflict scenarios', () => {
      it('returns empty result when no conflict exists', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'synced',
        });
        const remote = createMockWorkOrderRow();

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.hasConflict).toBe(false);
        expect(result.merged).toEqual({});
        expect(result.resolutions).toHaveLength(0);
        expect(result.escalations).toHaveLength(0);
      });
    });

    describe('status: completion_wins rule', () => {
      it('keeps completed when local is completed and remote is open', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          status: 'completed',
        });
        const remote = createMockWorkOrderRow({
          status: 'open',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.hasConflict).toBe(true);
        expect(result.merged.status).toBe('completed');
        const statusRes = result.resolutions.find(r => r.fieldName === 'status');
        expect(statusRes?.rule).toBe('completion_wins');
      });

      it('keeps completed when remote is completed and local is in_progress', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          status: 'in_progress',
        });
        const remote = createMockWorkOrderRow({
          status: 'completed',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.merged.status).toBe('completed');
      });

      it('keeps in_progress when local is in_progress and remote is open', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          status: 'in_progress',
        });
        const remote = createMockWorkOrderRow({
          status: 'open',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.merged.status).toBe('in_progress');
      });

      it('handles both in_progress with different started_at - later start wins', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          status: 'in_progress',
          startedAt: BASE_TIMESTAMP + 2 * ONE_HOUR, // Local started later
        });
        const remote = createMockWorkOrderRow({
          status: 'in_progress',
          started_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
          updated_at: toISOString(BASE_TIMESTAMP + 3 * ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.hasConflict).toBe(true);
        const startedRes = result.resolutions.find(r => r.fieldName === 'started_at_in_progress');
        expect(startedRes?.rule).toBe('later_start_wins');
      });
    });

    describe('priority: higher_priority_wins rule', () => {
      it('keeps emergency when local is emergency and remote is high', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          priority: 'emergency',
        });
        const remote = createMockWorkOrderRow({
          priority: 'high',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.merged.priority).toBe('emergency');
        const priorityRes = result.resolutions.find(r => r.fieldName === 'priority');
        expect(priorityRes?.rule).toBe('higher_priority_wins');
      });

      it('keeps high when remote is high and local is medium', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          priority: 'medium',
        });
        const remote = createMockWorkOrderRow({
          priority: 'high',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.merged.priority).toBe('high');
      });

      it('keeps medium when both are equal', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          priority: 'medium',
        });
        const remote = createMockWorkOrderRow({
          priority: 'medium',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        // No priority resolution needed when equal
        const priorityRes = result.resolutions.find(r => r.fieldName === 'priority');
        expect(priorityRes).toBeUndefined();
      });
    });

    describe('description: append_both rule', () => {
      it('appends both descriptions when different', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          description: 'Local description',
        });
        const remote = createMockWorkOrderRow({
          description: 'Remote description',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.merged.description).toContain('Local description');
        expect(result.merged.description).toContain('Remote description');
        expect(result.merged.description).toContain('---');
        const descRes = result.resolutions.find(r => r.fieldName === 'description');
        expect(descRes?.rule).toBe('append_both');
      });

      it('keeps single value when local is null', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          description: null,
        });
        const remote = createMockWorkOrderRow({
          description: 'Remote only',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.merged.description).toBe('Remote only');
      });

      it('keeps single value when remote is null', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          description: 'Local only',
        });
        const remote = createMockWorkOrderRow({
          description: null,
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.merged.description).toBe('Local only');
      });

      it('returns null when both are null', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          description: null,
        });
        const remote = createMockWorkOrderRow({
          description: null,
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        // No description resolution needed when both null
        const descRes = result.resolutions.find(r => r.fieldName === 'description');
        expect(descRes).toBeUndefined();
      });
    });

    describe('completion_notes: append_both with metadata', () => {
      it('appends notes with user attribution', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          completionNotes: 'Fixed the pump',
          completedBy: 'user-local',
        });
        const remote = createMockWorkOrderRow({
          completion_notes: 'Replaced seal',
          completed_by: 'user-remote',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.merged.completion_notes).toContain('Fixed the pump');
        expect(result.merged.completion_notes).toContain('Replaced seal');
        expect(result.merged.completion_notes).toContain('Local - user-local');
        expect(result.merged.completion_notes).toContain('Remote - user-remote');
      });
    });

    describe('time_spent_minutes: max_wins rule', () => {
      it('keeps higher value from local', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          timeSpentMinutes: 60,
        });
        const remote = createMockWorkOrderRow({
          time_spent_minutes: 30,
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.merged.time_spent_minutes).toBe(60);
        const timeRes = result.resolutions.find(r => r.fieldName === 'time_spent_minutes');
        expect(timeRes?.rule).toBe('max_wins');
      });

      it('keeps higher value from remote', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          timeSpentMinutes: 30,
        });
        const remote = createMockWorkOrderRow({
          time_spent_minutes: 90,
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.merged.time_spent_minutes).toBe(90);
      });
    });

    describe('due_date: earlier_wins rule', () => {
      it('keeps earlier due date from local', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          dueDate: BASE_TIMESTAMP,
        });
        const remote = createMockWorkOrderRow({
          due_date: toISOString(BASE_TIMESTAMP + ONE_DAY),
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(new Date(result.merged.due_date!).getTime()).toBe(BASE_TIMESTAMP);
        const dueRes = result.resolutions.find(r => r.fieldName === 'due_date');
        expect(dueRes?.rule).toBe('earlier_wins');
      });
    });

    describe('signature: signed_wins and earlier_signature_wins rules', () => {
      it('keeps local signature when only local is signed', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          signatureImageUrl: 'https://local-sig.jpg',
          signatureTimestamp: BASE_TIMESTAMP,
          signatureHash: 'local-hash',
        });
        const remote = createMockWorkOrderRow({
          signature_image_url: null,
          signature_timestamp: null,
          signature_hash: null,
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.merged.signature_image_url).toBe('https://local-sig.jpg');
        const sigRes = result.resolutions.find(r => r.fieldName === 'signature');
        expect(sigRes?.rule).toBe('signed_wins');
      });

      it('keeps remote signature when only remote is signed', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          signatureImageUrl: null,
          signatureTimestamp: null,
        });
        const remote = createMockWorkOrderRow({
          signature_image_url: 'https://remote-sig.jpg',
          signature_timestamp: toISOString(BASE_TIMESTAMP),
          signature_hash: 'remote-hash',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.merged.signature_image_url).toBe('https://remote-sig.jpg');
        const sigRes = result.resolutions.find(r => r.fieldName === 'signature');
        expect(sigRes?.rule).toBe('signed_wins');
      });

      it('keeps earlier signature when both are signed', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          signatureImageUrl: 'https://local-sig.jpg',
          signatureTimestamp: BASE_TIMESTAMP, // Earlier
          signatureHash: 'local-hash',
        });
        const remote = createMockWorkOrderRow({
          signature_image_url: 'https://remote-sig.jpg',
          signature_timestamp: toISOString(BASE_TIMESTAMP + ONE_HOUR), // Later
          signature_hash: 'remote-hash',
          updated_at: toISOString(BASE_TIMESTAMP + 2 * ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.merged.signature_image_url).toBe('https://local-sig.jpg');
        const sigRes = result.resolutions.find(r => r.fieldName === 'signature');
        expect(sigRes?.rule).toBe('earlier_signature_wins');
      });
    });

    describe('voice_note: keep_both rule', () => {
      it('concatenates voice note URLs with separator', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          voiceNoteUrl: 'https://local-voice.mp3',
          voiceNoteConfidence: 'high',
        });
        const remote = createMockWorkOrderRow({
          voice_note_url: 'https://remote-voice.mp3',
          voice_note_confidence: 'medium',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.merged.voice_note_url).toContain('https://local-voice.mp3');
        expect(result.merged.voice_note_url).toContain('https://remote-voice.mp3');
        expect(result.merged.voice_note_url).toContain('|');
        const voiceRes = result.resolutions.find(r => r.fieldName === 'voice_note_url');
        expect(voiceRes?.rule).toBe('keep_both');
      });
    });

    describe('needs_enrichment: false_wins rule', () => {
      it('resolves to false when local is false', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          needsEnrichment: false,
        });
        const remote = createMockWorkOrderRow({
          needs_enrichment: true,
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.merged.needs_enrichment).toBe(false);
        const enrichRes = result.resolutions.find(r => r.fieldName === 'needs_enrichment');
        expect(enrichRes?.rule).toBe('false_wins');
      });
    });

    describe('escalation: completion_conflict', () => {
      it('triggers when both completed by different users', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          status: 'completed',
          completedBy: 'user-A',
        });
        const remote = createMockWorkOrderRow({
          status: 'completed',
          completed_by: 'user-B',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.escalations).toContain('completion_conflict');
      });

      it('does not trigger when same user completed', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          status: 'completed',
          completedBy: 'user-A',
        });
        const remote = createMockWorkOrderRow({
          status: 'completed',
          completed_by: 'user-A',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.escalations).not.toContain('completion_conflict');
      });
    });

    describe('escalation: backdated_completion', () => {
      it('triggers when completed >24 hours before sync', () => {
        const syncTime = BASE_TIMESTAMP + 48 * ONE_HOUR; // 48 hours later
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
        });
        const remote = createMockWorkOrderRow({
          status: 'completed',
          completed_at: BASE_ISO, // Completed at BASE_TIMESTAMP
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote, syncTime);

        expect(result.escalations).toContain('backdated_completion');
      });

      it('does not trigger when completed within 24 hours', () => {
        const syncTime = BASE_TIMESTAMP + 12 * ONE_HOUR; // 12 hours later
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
        });
        const remote = createMockWorkOrderRow({
          status: 'completed',
          completed_at: BASE_ISO,
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote, syncTime);

        expect(result.escalations).not.toContain('backdated_completion');
      });
    });

    describe('escalation: quick_completion_no_notes', () => {
      it('triggers when completed in <5 min with no notes', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
        });
        const remote = createMockWorkOrderRow({
          status: 'completed',
          time_spent_minutes: 3,
          completion_notes: null,
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.escalations).toContain('quick_completion_no_notes');
      });

      it('does not trigger when has notes', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
        });
        const remote = createMockWorkOrderRow({
          status: 'completed',
          time_spent_minutes: 3,
          completion_notes: 'Quick fix applied',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.escalations).not.toContain('quick_completion_no_notes');
      });

      it('does not trigger when time >= 5 min', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
        });
        const remote = createMockWorkOrderRow({
          status: 'completed',
          time_spent_minutes: 5,
          completion_notes: null,
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.escalations).not.toContain('quick_completion_no_notes');
      });
    });

    describe('escalation: signature_mismatch', () => {
      it('triggers when both signed by different completed_by users', () => {
        const local = createMockWorkOrder({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          signatureImageUrl: 'https://sig-a.jpg',
          signatureTimestamp: BASE_TIMESTAMP,
          completedBy: 'user-A',
        });
        const remote = createMockWorkOrderRow({
          signature_image_url: 'https://sig-b.jpg',
          signature_timestamp: toISOString(BASE_TIMESTAMP + ONE_HOUR),
          completed_by: 'user-B',
          updated_at: toISOString(BASE_TIMESTAMP + 2 * ONE_HOUR),
        });

        const result = resolveWorkOrderConflict(local, remote);

        expect(result.escalations).toContain('signature_mismatch');
      });
    });
  });

  // ============================================================================
  // resolveAssetConflict() tests
  // ============================================================================
  describe('resolveAssetConflict', () => {
    describe('no conflict scenarios', () => {
      it('returns empty result when no conflict exists', () => {
        const local = createMockAsset({ localSyncStatus: 'synced' });
        const remote = createMockAssetRow();

        const result = resolveAssetConflict(local, remote);

        expect(result.hasConflict).toBe(false);
        expect(result.merged).toEqual({});
      });
    });

    describe('status: down_wins_safety rule', () => {
      it('keeps down when local is down and remote is operational', () => {
        const local = createMockAsset({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          status: 'down',
        });
        const remote = createMockAssetRow({
          status: 'operational',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveAssetConflict(local, remote);

        expect(result.merged.status).toBe('down');
        const statusRes = result.resolutions.find(r => r.fieldName === 'status');
        expect(statusRes?.rule).toBe('down_wins_safety');
      });

      it('keeps down when remote is down and local is limited', () => {
        const local = createMockAsset({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          status: 'limited',
        });
        const remote = createMockAssetRow({
          status: 'down',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveAssetConflict(local, remote);

        expect(result.merged.status).toBe('down');
      });

      it('keeps limited when local is limited and remote is operational', () => {
        const local = createMockAsset({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          status: 'limited',
        });
        const remote = createMockAssetRow({
          status: 'operational',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveAssetConflict(local, remote);

        expect(result.merged.status).toBe('limited');
      });
    });

    describe('meter_current_reading: higher_wins rule', () => {
      it('keeps higher reading from local', () => {
        const local = createMockAsset({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          meterCurrentReading: 5000,
        });
        const remote = createMockAssetRow({
          meter_current_reading: 4500,
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveAssetConflict(local, remote);

        expect(result.merged.meter_current_reading).toBe(5000);
        const meterRes = result.resolutions.find(r => r.fieldName === 'meter_current_reading');
        expect(meterRes?.rule).toBe('higher_wins');
      });

      it('keeps higher reading from remote', () => {
        const local = createMockAsset({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          meterCurrentReading: 4500,
        });
        const remote = createMockAssetRow({
          meter_current_reading: 5000,
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveAssetConflict(local, remote);

        expect(result.merged.meter_current_reading).toBe(5000);
      });
    });

    describe('description: append_both rule', () => {
      it('appends both descriptions', () => {
        const local = createMockAsset({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          description: 'Local notes',
        });
        const remote = createMockAssetRow({
          description: 'Remote notes',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveAssetConflict(local, remote);

        expect(result.merged.description).toContain('Local notes');
        expect(result.merged.description).toContain('Remote notes');
      });
    });

    describe('name: latest_wins rule', () => {
      it('keeps local name when local is newer', () => {
        const local = createMockAsset({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          localUpdatedAt: BASE_TIMESTAMP + 2 * ONE_HOUR,
          name: 'Local Name',
        });
        const remote = createMockAssetRow({
          name: 'Remote Name',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveAssetConflict(local, remote);

        expect(result.merged.name).toBe('Local Name');
        const nameRes = result.resolutions.find(r => r.fieldName === 'name');
        expect(nameRes?.rule).toBe('latest_wins');
      });

      it('keeps remote name when remote is newer', () => {
        const local = createMockAsset({
          localSyncStatus: 'pending',
          serverUpdatedAt: BASE_TIMESTAMP,
          localUpdatedAt: BASE_TIMESTAMP + ONE_HOUR,
          name: 'Local Name',
        });
        const remote = createMockAssetRow({
          name: 'Remote Name',
          updated_at: toISOString(BASE_TIMESTAMP + 2 * ONE_HOUR),
        });

        const result = resolveAssetConflict(local, remote);

        expect(result.merged.name).toBe('Remote Name');
      });
    });

    it('has no escalations for assets', () => {
      const local = createMockAsset({
        localSyncStatus: 'pending',
        serverUpdatedAt: BASE_TIMESTAMP,
        status: 'down',
      });
      const remote = createMockAssetRow({
        status: 'operational',
        updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
      });

      const result = resolveAssetConflict(local, remote);

      expect(result.escalations).toHaveLength(0);
    });
  });

  // ============================================================================
  // hasMeterReadingConflict() tests
  // ============================================================================
  describe('hasMeterReadingConflict', () => {
    it('returns false when localSyncStatus is synced', () => {
      const local = createMockMeterReading({
        localSyncStatus: 'synced',
        localUpdatedAt: BASE_TIMESTAMP,
      });

      expect(hasMeterReadingConflict(local, toISOString(BASE_TIMESTAMP + ONE_HOUR))).toBe(false);
    });

    it('returns true when local has pending changes and remote is newer', () => {
      const local = createMockMeterReading({
        localSyncStatus: 'pending',
        localUpdatedAt: BASE_TIMESTAMP,
      });

      expect(hasMeterReadingConflict(local, toISOString(BASE_TIMESTAMP + ONE_HOUR))).toBe(true);
    });

    it('returns false when local is newer than remote', () => {
      const local = createMockMeterReading({
        localSyncStatus: 'pending',
        localUpdatedAt: BASE_TIMESTAMP + ONE_HOUR,
      });

      expect(hasMeterReadingConflict(local, toISOString(BASE_TIMESTAMP))).toBe(false);
    });
  });

  // ============================================================================
  // resolveMeterReadingConflict() tests
  // ============================================================================
  describe('resolveMeterReadingConflict', () => {
    describe('no conflict scenarios', () => {
      it('returns empty result when no conflict exists', () => {
        const local = createMockMeterReading({ localSyncStatus: 'synced' });
        const remote = createMockMeterReadingRow();

        const result = resolveMeterReadingConflict(local, remote);

        expect(result.hasConflict).toBe(false);
        expect(result.merged).toEqual({});
      });
    });

    describe('reading_value: higher_wins rule', () => {
      it('keeps higher value from local', () => {
        const local = createMockMeterReading({
          localSyncStatus: 'pending',
          localUpdatedAt: BASE_TIMESTAMP,
          readingValue: 1500,
          readingDate: BASE_TIMESTAMP,
        });
        const remote = createMockMeterReadingRow({
          reading_value: 1000,
          reading_date: toISOString(BASE_TIMESTAMP + ONE_DAY),
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveMeterReadingConflict(local, remote);

        expect(result.merged.reading_value).toBe(1500);
        const readingRes = result.resolutions.find(r => r.fieldName === 'reading_value');
        expect(readingRes?.rule).toBe('higher_wins');
      });

      it('keeps higher value from remote', () => {
        const local = createMockMeterReading({
          localSyncStatus: 'pending',
          localUpdatedAt: BASE_TIMESTAMP,
          readingValue: 1000,
          readingDate: BASE_TIMESTAMP,
        });
        const remote = createMockMeterReadingRow({
          reading_value: 1500,
          reading_date: toISOString(BASE_TIMESTAMP + ONE_DAY),
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveMeterReadingConflict(local, remote);

        expect(result.merged.reading_value).toBe(1500);
      });
    });

    describe('reading_date: earlier_wins rule', () => {
      it('keeps earlier date from local', () => {
        const local = createMockMeterReading({
          localSyncStatus: 'pending',
          localUpdatedAt: BASE_TIMESTAMP,
          readingValue: 1000,
          readingDate: BASE_TIMESTAMP,
        });
        const remote = createMockMeterReadingRow({
          reading_value: 1000,
          reading_date: toISOString(BASE_TIMESTAMP + ONE_DAY),
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveMeterReadingConflict(local, remote);

        expect(new Date(result.merged.reading_date!).getTime()).toBe(BASE_TIMESTAMP);
        const dateRes = result.resolutions.find(r => r.fieldName === 'reading_date');
        expect(dateRes?.rule).toBe('earlier_wins');
      });
    });

    describe('notes: append_both rule', () => {
      it('appends both notes', () => {
        const local = createMockMeterReading({
          localSyncStatus: 'pending',
          localUpdatedAt: BASE_TIMESTAMP,
          readingValue: 1000,
          readingDate: BASE_TIMESTAMP,
          notes: 'Local note',
        });
        const remote = createMockMeterReadingRow({
          reading_value: 1000,
          notes: 'Remote note',
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveMeterReadingConflict(local, remote);

        expect(result.merged.notes).toContain('Local note');
        expect(result.merged.notes).toContain('Remote note');
      });
    });

    describe('escalation: same_time_different_values', () => {
      it('triggers when readings within 5 min tolerance have different values', () => {
        const local = createMockMeterReading({
          localSyncStatus: 'pending',
          localUpdatedAt: BASE_TIMESTAMP,
          readingValue: 1000,
          readingDate: BASE_TIMESTAMP,
        });
        const remote = createMockMeterReadingRow({
          reading_value: 1100, // Different value
          reading_date: toISOString(BASE_TIMESTAMP + 2 * 60 * 1000), // 2 minutes later (within tolerance)
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveMeterReadingConflict(local, remote);

        expect(result.escalations).toContain('same_time_different_values');
        // Should not merge when this escalation triggers
        expect(result.merged).toEqual({});
      });

      it('does not trigger when times differ by more than 5 minutes', () => {
        const local = createMockMeterReading({
          localSyncStatus: 'pending',
          localUpdatedAt: BASE_TIMESTAMP,
          readingValue: 1000,
          readingDate: BASE_TIMESTAMP,
        });
        const remote = createMockMeterReadingRow({
          reading_value: 1100,
          reading_date: toISOString(BASE_TIMESTAMP + 10 * 60 * 1000), // 10 minutes later
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveMeterReadingConflict(local, remote);

        expect(result.escalations).not.toContain('same_time_different_values');
      });
    });

    describe('escalation: extreme_reading_jump', () => {
      it('triggers when reading differs by >10x', () => {
        const local = createMockMeterReading({
          localSyncStatus: 'pending',
          localUpdatedAt: BASE_TIMESTAMP,
          readingValue: 100,
          readingDate: BASE_TIMESTAMP,
        });
        const remote = createMockMeterReadingRow({
          reading_value: 1100, // 11x difference
          reading_date: toISOString(BASE_TIMESTAMP + ONE_DAY),
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveMeterReadingConflict(local, remote);

        expect(result.escalations).toContain('extreme_reading_jump');
      });

      it('does not trigger when difference is <= 10x', () => {
        const local = createMockMeterReading({
          localSyncStatus: 'pending',
          localUpdatedAt: BASE_TIMESTAMP,
          readingValue: 100,
          readingDate: BASE_TIMESTAMP,
        });
        const remote = createMockMeterReadingRow({
          reading_value: 500, // 5x difference
          reading_date: toISOString(BASE_TIMESTAMP + ONE_DAY),
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveMeterReadingConflict(local, remote);

        expect(result.escalations).not.toContain('extreme_reading_jump');
      });
    });

    describe('escalation: out_of_order_reading', () => {
      it('triggers when newer reading has lower value', () => {
        const local = createMockMeterReading({
          localSyncStatus: 'pending',
          localUpdatedAt: BASE_TIMESTAMP,
          readingValue: 800, // Lower value
          readingDate: BASE_TIMESTAMP + ONE_DAY, // But newer time
        });
        const remote = createMockMeterReadingRow({
          reading_value: 1000, // Higher value
          reading_date: toISOString(BASE_TIMESTAMP), // Older time
          updated_at: toISOString(BASE_TIMESTAMP + ONE_HOUR),
        });

        const result = resolveMeterReadingConflict(local, remote);

        expect(result.escalations).toContain('out_of_order_reading');
      });
    });
  });

  // ============================================================================
  // resolveWorkOrderPhotoConflict() tests
  // ============================================================================
  describe('resolveWorkOrderPhotoConflict', () => {
    describe('union strategy', () => {
      it('keeps all photos from both local and remote', () => {
        const localPhotos = [
          {
            id: 'local-1',
            serverId: null,
            localUri: '/local/photo1.jpg',
            remoteUrl: null,
            caption: 'Local photo 1',
            takenAt: BASE_TIMESTAMP,
          },
        ];
        const remotePhotos = [
          createMockWorkOrderPhotoRow({
            id: 'remote-1',
            remote_url: 'https://remote/photo1.jpg',
            caption: 'Remote photo 1',
          }),
        ];

        const result = resolveWorkOrderPhotoConflict(localPhotos, remotePhotos);

        expect(result.photos).toHaveLength(2);
        expect(result.photos.some(p => p.localUri === '/local/photo1.jpg')).toBe(true);
        expect(result.photos.some(p => p.remoteUrl === 'https://remote/photo1.jpg')).toBe(true);
      });

      it('never deletes photos', () => {
        const localPhotos = [
          {
            id: 'photo-1',
            serverId: 'server-1',
            localUri: '/local/photo1.jpg',
            remoteUrl: 'https://remote/photo1.jpg',
            caption: 'Photo 1',
            takenAt: BASE_TIMESTAMP,
          },
          {
            id: 'photo-2',
            serverId: null,
            localUri: '/local/photo2.jpg',
            remoteUrl: null,
            caption: 'Local only',
            takenAt: BASE_TIMESTAMP,
          },
        ];
        const remotePhotos = [
          createMockWorkOrderPhotoRow({
            id: 'server-1',
            remote_url: 'https://remote/photo1.jpg',
          }),
          // photo-2 not on server yet
        ];

        const result = resolveWorkOrderPhotoConflict(localPhotos, remotePhotos);

        expect(result.photos).toHaveLength(2);
      });
    });

    describe('caption merge', () => {
      it('merges captions when same photo has different captions', () => {
        const localPhotos = [
          {
            id: 'local-1',
            serverId: 'server-1',
            localUri: '/local/photo1.jpg',
            remoteUrl: 'https://remote/photo1.jpg',
            caption: 'Local caption',
            takenAt: BASE_TIMESTAMP,
          },
        ];
        const remotePhotos = [
          createMockWorkOrderPhotoRow({
            id: 'server-1',
            remote_url: 'https://remote/photo1.jpg',
            caption: 'Remote caption',
          }),
        ];

        const result = resolveWorkOrderPhotoConflict(localPhotos, remotePhotos);

        expect(result.hasConflict).toBe(true);
        expect(result.captionMergeCount).toBe(1);
        const mergedPhoto = result.photos.find(p => p.serverId === 'server-1');
        expect(mergedPhoto?.caption).toContain('Local caption');
        expect(mergedPhoto?.caption).toContain('Remote caption');
        expect(mergedPhoto?.source).toBe('merged');
      });

      it('keeps original caption when same', () => {
        const localPhotos = [
          {
            id: 'local-1',
            serverId: 'server-1',
            localUri: '/local/photo1.jpg',
            remoteUrl: 'https://remote/photo1.jpg',
            caption: 'Same caption',
            takenAt: BASE_TIMESTAMP,
          },
        ];
        const remotePhotos = [
          createMockWorkOrderPhotoRow({
            id: 'server-1',
            remote_url: 'https://remote/photo1.jpg',
            caption: 'Same caption',
          }),
        ];

        const result = resolveWorkOrderPhotoConflict(localPhotos, remotePhotos);

        expect(result.captionMergeCount).toBe(0);
        const photo = result.photos.find(p => p.serverId === 'server-1');
        expect(photo?.caption).toBe('Same caption');
        expect(photo?.source).toBe('local');
      });
    });

    describe('source tracking', () => {
      it('marks local-only photos with source=local', () => {
        const localPhotos = [
          {
            id: 'local-only',
            serverId: null,
            localUri: '/local/new.jpg',
            remoteUrl: null,
            caption: 'New local',
            takenAt: BASE_TIMESTAMP,
          },
        ];
        const remotePhotos: ReturnType<typeof createMockWorkOrderPhotoRow>[] = [];

        const result = resolveWorkOrderPhotoConflict(localPhotos, remotePhotos);

        expect(result.photos[0]?.source).toBe('local');
      });

      it('marks remote-only photos with source=remote', () => {
        const localPhotos: Array<{
          id: string;
          serverId: string | null;
          localUri: string | null;
          remoteUrl: string | null;
          caption: string | null;
          takenAt: number;
        }> = [];
        const remotePhotos = [
          createMockWorkOrderPhotoRow({
            id: 'remote-only',
            remote_url: 'https://remote/new.jpg',
          }),
        ];

        const result = resolveWorkOrderPhotoConflict(localPhotos, remotePhotos);

        expect(result.photos[0]?.source).toBe('remote');
        expect(result.hasConflict).toBe(true); // New remote photo indicates conflict
      });

      it('marks merged photos with source=merged', () => {
        const localPhotos = [
          {
            id: 'local-1',
            serverId: 'server-1',
            localUri: '/local/photo.jpg',
            remoteUrl: 'https://remote/photo.jpg',
            caption: 'Local version',
            takenAt: BASE_TIMESTAMP,
          },
        ];
        const remotePhotos = [
          createMockWorkOrderPhotoRow({
            id: 'server-1',
            remote_url: 'https://remote/photo.jpg',
            caption: 'Remote version',
          }),
        ];

        const result = resolveWorkOrderPhotoConflict(localPhotos, remotePhotos);

        const mergedPhoto = result.photos.find(p => p.source === 'merged');
        expect(mergedPhoto).toBeDefined();
      });
    });

    describe('matching by URL', () => {
      it('matches photos by remoteUrl when serverId is missing', () => {
        const localPhotos = [
          {
            id: 'local-1',
            serverId: null, // No serverId yet
            localUri: '/local/photo.jpg',
            remoteUrl: 'https://remote/photo.jpg', // But has remoteUrl
            caption: 'Local caption',
            takenAt: BASE_TIMESTAMP,
          },
        ];
        const remotePhotos = [
          createMockWorkOrderPhotoRow({
            id: 'server-1',
            remote_url: 'https://remote/photo.jpg',
            caption: 'Remote caption',
          }),
        ];

        const result = resolveWorkOrderPhotoConflict(localPhotos, remotePhotos);

        // Should match by URL and merge, not create duplicate
        expect(result.photos).toHaveLength(1);
        expect(result.captionMergeCount).toBe(1);
      });
    });

    describe('mergedCaptions tracking', () => {
      it('records details of merged captions', () => {
        const localPhotos = [
          {
            id: 'local-1',
            serverId: 'server-1',
            localUri: '/local/photo.jpg',
            remoteUrl: null,
            caption: 'Local desc',
            takenAt: BASE_TIMESTAMP,
          },
        ];
        const remotePhotos = [
          createMockWorkOrderPhotoRow({
            id: 'server-1',
            caption: 'Remote desc',
          }),
        ];

        const result = resolveWorkOrderPhotoConflict(localPhotos, remotePhotos);

        expect(result.mergedCaptions).toHaveLength(1);
        expect(result.mergedCaptions[0]?.photoId).toBe('server-1');
        expect(result.mergedCaptions[0]?.localCaption).toBe('Local desc');
        expect(result.mergedCaptions[0]?.remoteCaption).toBe('Remote desc');
      });
    });
  });
});
