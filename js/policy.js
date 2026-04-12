function clampPolicyReputation(value) {
  return Math.max(0, value);
}

function getBaseRecommendation(guest) {
  if (!guest) {
    return {
      recommendation: 'Approve',
      severity: 'low',
      reason: 'No policy concerns detected.'
    };
  }

  if (
    guest.riskLevel === 'High' ||
    guest.trait === 'Unstable' ||
    guest.trait === 'Aggressive'
  ) {
    return {
      recommendation: 'Deny',
      severity: 'high',
      reason: 'Guest behavior exceeds motel safety policy.'
    };
  }

  if (
    guest.riskLevel === 'Medium' ||
    guest.trait === 'Evasive' ||
    guest.trait === 'Nervous'
  ) {
    return {
      recommendation: 'Watch',
      severity: 'medium',
      reason: 'Guest should be monitored before room assignment.'
    };
  }

  return {
    recommendation: 'Approve',
    severity: 'low',
    reason: 'Guest fits standard overnight policy.'
  };
}

export function applyPolicyToGuest(guest, night = 1) {
  const base = getBaseRecommendation(guest);

  if (!guest) {
    return guest;
  }

  const upgraded =
    night >= 3 &&
    base.recommendation === 'Watch' &&
    (guest.flagged || guest.riskLevel === 'Medium')
      ? {
          recommendation: 'Deny',
          severity: 'high',
          reason: 'Night pressure raised this guest above motel safety tolerance.'
        }
      : base;

  return {
    ...guest,
    policyRecommendation: upgraded.recommendation,
    policySeverity: upgraded.severity,
    policyReason: upgraded.reason
  };
}

export function normalizePolicyGuests(guests = [], night = 1) {
  return guests.map((guest) => {
    if (
      guest &&
      guest.policyRecommendation &&
      guest.policySeverity &&
      guest.policyReason
    ) {
      return guest;
    }

    return applyPolicyToGuest(guest, night);
  });
}

export function evaluatePolicyDecision({ guest, action, night = 1 }) {
  const currentGuest = applyPolicyToGuest(guest, night);
  const recommendation = currentGuest?.policyRecommendation || 'Approve';

  if (action === 'flag') {
    if (recommendation === 'Watch') {
      return {
        logs: [
          `Motel policy check: ${currentGuest.name} was correctly flagged for observation.`,
          `${currentGuest.name} matched the motel's caution policy before room assignment.`
        ],
        reputationDelta: 1,
        forceWatch: false,
        policyOverride: false
      };
    }

    if (recommendation === 'Deny') {
      return {
        logs: [
          `Motel policy warning: ${currentGuest.name} actually meets denial criteria, not simple observation.`,
          `${currentGuest.name} remains a serious safety concern under motel policy.`
        ],
        reputationDelta: 0,
        forceWatch: true,
        policyOverride: true
      };
    }

    return {
      logs: [
        `Motel policy note: ${currentGuest.name} was flagged despite being policy-approved.`
      ],
      reputationDelta: 0,
      forceWatch: false,
      policyOverride: false
    };
  }

  if (action === 'reject') {
    if (recommendation === 'Deny') {
      return {
        logs: [
          `Motel policy upheld: ${currentGuest.name} was denied entry under safety rules.`
        ],
        reputationDelta: 1,
        forceWatch: false,
        policyOverride: false
      };
    }

    if (recommendation === 'Watch') {
      return {
        logs: [
          `Motel policy note: ${currentGuest.name} was denied rather than processed under observation.`
        ],
        reputationDelta: 0,
        forceWatch: false,
        policyOverride: false
      };
    }

    return {
      logs: [
        `Motel policy breach: ${currentGuest.name} was rejected despite being policy-approved.`,
        `Front desk decision may have cost the motel a legitimate guest.`
      ],
      reputationDelta: -1,
      forceWatch: false,
      policyOverride: true
    };
  }

  if (action === 'checkin') {
    if (recommendation === 'Approve') {
      return {
        logs: [
          `Motel policy approved ${currentGuest.name} for standard room assignment.`
        ],
        reputationDelta: 0,
        forceWatch: false,
        policyOverride: false
      };
    }

    if (recommendation === 'Watch') {
      if (currentGuest.flagged) {
        return {
          logs: [
            `Motel policy followed: ${currentGuest.name} was checked in under observation.`
          ],
          reputationDelta: 1,
          forceWatch: true,
          policyOverride: false
        };
      }

      return {
        logs: [
          `Motel policy warning: ${currentGuest.name} should have been flagged before room assignment.`,
          `${currentGuest.name} was checked in without recommended observation.`
        ],
        reputationDelta: -1,
        forceWatch: true,
        policyOverride: true
      };
    }

    return {
      logs: [
        `Motel policy breach: ${currentGuest.name} was checked in despite denial guidance.`,
        `${currentGuest.name} entered the motel against safety recommendation.`
      ],
      reputationDelta: -2,
      forceWatch: true,
      policyOverride: true
    };
  }

  return {
    logs: [],
    reputationDelta: 0,
    forceWatch: false,
    policyOverride: false
  };
}

export function applyPolicyToRoom(room, guest, policyOutcome) {
  if (!room) return room;

  const updatedRoom = { ...room };

  updatedRoom.policyRecommendation = guest?.policyRecommendation || 'Approve';
  updatedRoom.policyOverride = Boolean(policyOutcome?.policyOverride);

  if (policyOutcome?.forceWatch && updatedRoom.condition === 'Stable') {
    updatedRoom.condition = 'Watch';
  }

  return updatedRoom;
}

export function applyPolicyReputation(currentValue, delta) {
  return clampPolicyReputation(currentValue + delta);
}