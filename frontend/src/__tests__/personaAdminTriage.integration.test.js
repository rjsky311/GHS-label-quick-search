import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import axios from 'axios';

jest.mock('axios');

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
  Toaster: () => null,
}));

const mockRefreshPilotDashboard = jest.fn();
const mockSaveManualEntry = jest.fn();
const mockSaveAlias = jest.fn();
const mockSaveReferenceLink = jest.fn();
const mockResolveMissQuery = jest.fn();
const mockPurgeStaleMissQueries = jest.fn();
const mockUpdateCorrectionRequestStatus = jest.fn();

const pilotDashboardReport = {
  counters: {
    'upstream.total': 1,
  },
  recentEvents: [],
  dictionary: {
    pendingAliasCount: 1,
    pendingManualEntryCount: 1,
    openMissQueryCount: 2,
    openCorrectionRequestCount: 1,
    manualEntryCount: 3,
    manualEntryStatusCounts: {
      approved: 2,
      pending: 1,
      needs_evidence: 1,
      rejected: 0,
    },
    aliasStatusCounts: {
      approved: 1,
      pending: 1,
      needs_evidence: 0,
      rejected: 0,
    },
    referenceLinkCount: 4,
    referenceLinkStatusCounts: {
      active: 4,
      inactive: 1,
    },
    correctionRequestStatusCounts: {
      open: 1,
      candidate_found: 1,
      approved: 0,
      rejected: 0,
      ignored: 0,
    },
    convertedCorrectionCandidateCount: 1,
    convertedCorrectionCandidates: [
      {
        id: 202,
        issue_type: 'source-conflict',
        cas_number: '67-64-1',
        chemical_name: 'Acetone',
        candidate: {
          cas_number: '67-64-1',
          name_en: 'Acetone',
          name_zh: '丙酮',
          source: 'admin-correction-request',
          approved_for_public_use: false,
          converted_to_manual_entry: true,
          manual_entry_status: 'pending',
          public_data_changed: false,
        },
        status: 'candidate_found',
        updated_at: '2026-04-18T14:00:00+00:00',
      },
    ],
    missQueryStatusCounts: {
      open: 2,
      needs_evidence: 1,
      resolved: 4,
      ignored: 0,
    },
    missQueryRetention: {
      retentionDays: 90,
      purgeableCount: 5,
      retainedNeedsEvidenceCount: 1,
    },
    pilotTriage: {
      openWorkItemCount: 12,
      attentionSignalCount: 25,
      attentionCounts: {
        openCorrectionRequests: 2,
        unresolvedSearches: 3,
        candidateFoundAwaitingManualReview: 1,
        manualEntriesInReview: 2,
        needsEvidenceWorkItems: 4,
        missingChineseNameReports: 1,
        sourceConflictReports: 2,
        noGhsReports: 5,
        staleMissQueryRows: 5,
        upstreamRetryRows: 1,
      },
      recommendedFocus: [
        {
          key: 'correction_intake',
          targetKey: 'correction_requests',
          targetLabel: 'Correction requests',
          message: 'Review open correction requests before adding new data sources.',
          nextAction:
            'Open correction queue and decide approve, reject, or needs evidence.',
          count: 2,
        },
      ],
    },
    topMissQueries: [
      {
        id: 101,
        query_text: 'mystery solvent',
        query_kind: 'name',
        endpoint: 'search_single',
        hit_count: 2,
        resolution_status: 'open',
        resolved_cas: null,
        context: {},
        last_seen_at: '2026-04-18T00:00:00+00:00',
      },
    ],
    topCorrectionRequests: [
      {
        id: 201,
        issue_type: 'missing-chinese-name',
        cas_number: '64-17-5',
        chemical_name: 'Ethanol',
        current_output: 'English name only',
        expected_output: 'Chinese name: 乙醇',
        evidence_url: 'https://example.com/evidence',
        duplicate_count: 3,
        status: 'open',
        updated_at: '2026-04-18T13:00:00+00:00',
      },
    ],
    pendingAliases: [
      {
        alias_text: 'buffer x',
        locale: 'en',
        cas_number: '123-45-6',
        hit_count: 3,
      },
    ],
    pendingManualEntries: [
      {
        cas_number: '555-55-5',
        name_en: 'Review Solvent',
        name_zh: '審核溶劑',
        source: 'manual',
        status: 'needs_evidence',
      },
    ],
  },
};

const pilotHookState = {
  report: pilotDashboardReport,
  aliases: [
    {
      alias_text: 'buffer x',
      locale: 'en',
      cas_number: '123-45-6',
      status: 'pending',
      updated_at: '2026-04-18T09:00:00+00:00',
    },
  ],
  manualEntries: [
    {
      cas_number: '555-55-5',
      name_en: 'Review Solvent',
      name_zh: '審核溶劑',
      source: 'manual',
      status: 'needs_evidence',
      updated_at: '2026-04-18T12:00:00+00:00',
    },
  ],
  referenceLinks: [
    {
      casNumber: '64-17-5',
      label: 'Supplier SDS',
      url: 'https://example.com/sds',
      linkType: 'sds',
      priority: 10,
      status: 'active',
      updatedAt: '2026-04-18T11:00:00+00:00',
    },
  ],
  correctionRequests: [
    {
      id: 201,
      evidence_url: 'https://example.com/evidence',
      duplicate_count: 3,
      issue_type: 'missing-chinese-name',
      cas_number: '64-17-5',
      chemical_name: 'Ethanol',
      current_output: 'English name only',
      expected_output: 'Chinese name: 乙醇',
      status: 'open',
      updated_at: '2026-04-18T13:00:00+00:00',
    },
    {
      id: 202,
      issue_type: 'source-conflict',
      cas_number: '67-64-1',
      chemical_name: 'Acetone',
      expected_output: 'Review source conflict before publishing.',
      candidate: {
        cas_number: '67-64-1',
        name_en: 'Acetone',
        name_zh: '丙酮',
        source: 'admin-correction-request',
        approved_for_public_use: false,
        converted_to_manual_entry: true,
        manual_entry_status: 'pending',
      },
      status: 'candidate_found',
      updated_at: '2026-04-18T14:00:00+00:00',
    },
  ],
  loading: false,
  saving: false,
  error: '',
  authError: '',
  refresh: mockRefreshPilotDashboard,
  saveManualEntry: mockSaveManualEntry,
  saveAlias: mockSaveAlias,
  saveReferenceLink: mockSaveReferenceLink,
  resolveMissQuery: mockResolveMissQuery,
  purgeStaleMissQueries: mockPurgeStaleMissQueries,
  updateCorrectionRequestStatus: mockUpdateCorrectionRequestStatus,
};

const mockUsePilotDashboard = jest.fn(({ enabled }) => ({
  ...pilotHookState,
  report: enabled ? pilotDashboardReport : null,
}));

jest.mock('@/hooks/usePilotDashboard', () => ({
  __esModule: true,
  default: (options) => mockUsePilotDashboard(options),
}));

process.env.VITE_ENABLE_PILOT_ADMIN = 'true';
const App = require('@/App').default;

describe('persona gate: admin data curator triage', () => {
  const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: { results: [] } });
    axios.post.mockResolvedValue({ data: [] });
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('unlocks the admin dashboard and exposes the next curation action', async () => {
    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('pilot-dashboard-toggle-btn'));
    });

    expect(screen.getByTestId('pilot-admin-dialog')).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(screen.getByTestId('pilot-admin-key-input'), {
        target: { value: 'pilot-secret' },
      });
      fireEvent.click(screen.getByTestId('pilot-admin-submit-btn'));
    });

    await waitFor(() =>
      expect(screen.getByTestId('pilot-triage-panel')).toBeInTheDocument()
    );

    expect(window.sessionStorage.getItem('ghs.pilotAdminKey')).toBe(
      'pilot-secret'
    );
    expect(mockUsePilotDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        adminKey: 'pilot-secret',
      })
    );

    expect(screen.getByTestId('pilot-triage-open-work-items')).toHaveTextContent(
      '12'
    );
    expect(screen.getByTestId('pilot-triage-attention-signals')).toHaveTextContent(
      '25'
    );
    expect(screen.getByTestId('pilot-triage-open-corrections')).toHaveTextContent(
      '2'
    );
    expect(screen.getByTestId('pilot-triage-unresolved-searches')).toHaveTextContent(
      '3'
    );
    expect(
      screen.getByTestId('pilot-triage-missing-chinese-names')
    ).toHaveTextContent('1');
    expect(screen.getByTestId('pilot-triage-source-conflicts')).toHaveTextContent(
      '2'
    );
    expect(screen.getByTestId('pilot-triage-no-ghs')).toHaveTextContent('5');
    expect(screen.getByTestId('pilot-triage-stale-telemetry')).toHaveTextContent(
      '5'
    );
    expect(screen.getByTestId('pilot-triage-primary-action-count')).toHaveTextContent(
      '2'
    );
    expect(
      screen.getByTestId('pilot-triage-primary-action-open-target')
    ).toBeInTheDocument();

    expect(screen.getByTestId('pilot-summary-open-miss-queries')).toHaveTextContent(
      '2'
    );
    expect(
      screen.getByTestId('pilot-summary-open-correction-requests')
    ).toHaveTextContent('1');
    expect(
      screen.getByTestId('pilot-summary-pending-manual-entries')
    ).toHaveTextContent('1');

    expect(screen.getByText('mystery solvent')).toBeInTheDocument();
    expect(screen.getByTestId('needs-evidence-miss-query-101')).toBeInTheDocument();
    expect(screen.getByTestId('correction-request-row-201')).toBeInTheDocument();
    expect(screen.getByTestId('correction-request-expected-201')).toHaveTextContent(
      '乙醇'
    );
    expect(
      screen.getByTestId('correction-request-duplicate-count-201')
    ).toBeInTheDocument();
    expect(screen.getByTestId('correction-request-evidence-link-201')).toHaveAttribute(
      'href',
      'https://example.com/evidence'
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('pilot-triage-primary-action-open-target'));
    });

    await waitFor(() => {
      expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });
});
