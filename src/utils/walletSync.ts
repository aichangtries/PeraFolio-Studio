import {
  OnlineAccount,
  OnlineAppId,
  MayaPockets,
  Transaction,
  SavingsGoal,
  SavingsGoalHistoryItem,
} from '../types';
import { convertCurrency } from './currency';

/**
 * Maps a payment method name, note, or tag to an OnlineAppId and optional sub-pocket/client.
 */
export function identifyAccountFromPaymentMethod(
  paymentMethod: string = '',
  tags: string[] = []
): { accountId: OnlineAppId; sub?: string } | null {
  const pLower = paymentMethod.toLowerCase();
  const tagsJoined = tags.join(' ').toLowerCase();
  const combined = `${pLower} ${tagsJoined}`;

  // 1. GoTyme
  if (combined.includes('gotyme')) {
    return { accountId: 'gotyme' };
  }

  // 2. MariBank
  if (combined.includes('maribank')) {
    return { accountId: 'maribank' };
  }

  // 3. Maya & specific pockets
  if (combined.includes('maya')) {
    if (combined.includes('emergency')) {
      return { accountId: 'maya', sub: 'emergencyFund' };
    }
    if (combined.includes('first milly') || combined.includes('first-milly') || combined.includes('milly')) {
      return { accountId: 'maya', sub: 'firstMilly' };
    }
    if (combined.includes('travel')) {
      return { accountId: 'maya', sub: 'travel' };
    }
    return { accountId: 'maya' };
  }

  // 4. Wise & specific client sources
  if (combined.includes('wise')) {
    if (
      combined.includes('company 1') ||
      combined.includes('company1') ||
      combined.includes('client 1') ||
      combined.includes('client1') ||
      combined.includes('techvanguard')
    ) {
      return { accountId: 'wise', sub: 'comp1' };
    }
    if (
      combined.includes('company 2') ||
      combined.includes('company2') ||
      combined.includes('client 2') ||
      combined.includes('client2') ||
      combined.includes('nexa') ||
      combined.includes('studio')
    ) {
      return { accountId: 'wise', sub: 'comp2' };
    }
    return { accountId: 'wise' };
  }

  // 5. GCash
  if (combined.includes('gcash')) {
    return { accountId: 'gcash' };
  }

  return null;
}

/**
 * Calculates total money held across all 5 online accounts in base currency
 */
export function calculateTotalWalletsNetWorth(
  accounts: OnlineAccount[] = [],
  baseCurrency: string = 'PHP',
  customRates: Record<string, number> = {}
): number {
  return accounts.reduce((acc, account) => {
    let accountNativeTotal = account.balance;

    if (account.id === 'maya' && account.mayaPockets) {
      accountNativeTotal =
        (account.mayaPockets.emergencyFund || 0) +
        (account.mayaPockets.firstMilly || 0) +
        (account.mayaPockets.travel || 0);
    } else if (account.id === 'wise' && account.wiseClients && account.wiseClients.length > 0) {
      accountNativeTotal = account.wiseClients.reduce((sum, c) => sum + (c.balance || 0), 0);
    }

    const inBase = convertCurrency(accountNativeTotal, account.currency, baseCurrency, customRates);
    return acc + inBase;
  }, 0);
}

/**
 * Applies or reverts a transaction on the accounts array.
 * Returns the updated accounts array and any Maya pockets that were modified.
 */
export function applyTransactionToAccounts(
  accounts: OnlineAccount[],
  transaction: Transaction,
  direction: 'apply' | 'revert',
  customRates: Record<string, number> = {}
): {
  updatedAccounts: OnlineAccount[];
  updatedMayaPockets?: MayaPockets;
} {
  const match = identifyAccountFromPaymentMethod(transaction.paymentMethod, transaction.tags);
  if (!match) {
    return { updatedAccounts: accounts };
  }

  const { accountId, sub } = match;
  const targetAcc = accounts.find((a) => a.id === accountId);
  if (!targetAcc) {
    return { updatedAccounts: accounts };
  }

  // Convert transaction amount to target account native currency
  const amountInAccountCurrency = convertCurrency(
    transaction.amount,
    transaction.currency,
    targetAcc.currency,
    customRates
  );

  // Delta calculation:
  // When applying: income increases balance (+), expense decreases balance (-)
  // When reverting: income decreases balance (-), expense increases balance (+)
  let multiplier = 0;
  if (direction === 'apply') {
    multiplier = transaction.type === 'income' ? 1 : -1;
  } else {
    multiplier = transaction.type === 'income' ? -1 : 1;
  }

  const delta = amountInAccountCurrency * multiplier;

  let newMayaPockets: MayaPockets | undefined = undefined;

  const updatedAccounts = accounts.map((acc) => {
    if (acc.id !== accountId) return acc;

    const cloned = { ...acc, lastUpdated: Date.now() };

    // Handle Maya pockets
    if (acc.id === 'maya' && cloned.mayaPockets) {
      const pockets = { ...cloned.mayaPockets };
      let pocketKey: keyof MayaPockets = 'emergencyFund';

      if (sub === 'firstMilly') pocketKey = 'firstMilly';
      else if (sub === 'travel') pocketKey = 'travel';
      else if (sub === 'emergencyFund') pocketKey = 'emergencyFund';
      else {
        // If unspecified maya pocket, distribute or attribute to emergency
        pocketKey = 'emergencyFund';
      }

      const curVal = pockets[pocketKey] || 0;
      pockets[pocketKey] = Math.max(0, curVal + delta);

      cloned.mayaPockets = pockets;
      cloned.balance = pockets.emergencyFund + pockets.firstMilly + pockets.travel;
      newMayaPockets = pockets;
      return cloned;
    }

    // Handle Wise clients
    if (acc.id === 'wise' && cloned.wiseClients) {
      const clients = cloned.wiseClients.map((c) => ({ ...c }));
      let clientIndex = 0;
      if (sub === 'comp2' && clients.length > 1) clientIndex = 1;

      if (clients[clientIndex]) {
        clients[clientIndex].balance = Math.max(0, (clients[clientIndex].balance || 0) + delta);
      }

      cloned.wiseClients = clients;
      cloned.balance = clients.reduce((sum, c) => sum + c.balance, 0);
      return cloned;
    }

    // Standard single-balance accounts (GoTyme, MariBank, GCash)
    cloned.balance = Math.max(0, cloned.balance + delta);
    return cloned;
  });

  return {
    updatedAccounts,
    updatedMayaPockets: newMayaPockets,
  };
}

/**
 * Determines the Maya pocket key for a given savings goal.
 */
export function getLinkedMayaPocketKey(goal: SavingsGoal): string {
  if (goal.linkedMayaPocket) {
    return goal.linkedMayaPocket;
  }
  const nameLower = goal.name.toLowerCase();
  if (nameLower.includes('emergency')) return 'emergencyFund';
  if (nameLower.includes('first milly') || nameLower.includes('milly')) return 'firstMilly';
  if (nameLower.includes('travel')) return 'travel';

  // Format name into a clean key
  const cleanKey = goal.name
    .toLowerCase()
    .replace(/^maya[:\s-]*/i, '')
    .trim()
    .replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');

  return cleanKey || 'emergencyFund';
}

/**
 * Checks whether a savings goal is synchronized with Maya.
 * Defaults to true for all Maya-tagged or standard savings goals.
 */
export function isGoalSyncedWithMaya(goal: SavingsGoal): boolean {
  if (goal.isSyncedWithMaya !== undefined) {
    return goal.isSyncedWithMaya;
  }
  const nameLower = goal.name.toLowerCase();
  return (
    nameLower.includes('maya') ||
    nameLower.includes('emergency') ||
    nameLower.includes('milly') ||
    nameLower.includes('travel')
  );
}

/**
 * Reconciles Maya accounts and Savings Goals to guarantee 100% data consistency.
 */
export function reconcileMayaAndSavingsGoals(
  accounts: OnlineAccount[],
  goals: SavingsGoal[]
): {
  updatedAccounts: OnlineAccount[];
  updatedSavingsGoals: SavingsGoal[];
} {
  const mayaIndex = accounts.findIndex((a) => a.id === 'maya');
  if (mayaIndex === -1) {
    return { updatedAccounts: accounts, updatedSavingsGoals: goals };
  }

  const maya = accounts[mayaIndex];
  const pockets: MayaPockets = {
    emergencyFund: maya.mayaPockets?.emergencyFund ?? 75000,
    firstMilly: maya.mayaPockets?.firstMilly ?? 65000,
    travel: maya.mayaPockets?.travel ?? 25000,
    ...(maya.mayaPockets || {}),
  };

  const updatedGoals = goals.map((goal) => {
    const isSynced = isGoalSyncedWithMaya(goal);
    if (!isSynced) return goal;

    const pocketKey = getLinkedMayaPocketKey(goal);
    // If pocket exists in Maya, use Maya's value
    if (typeof pockets[pocketKey] === 'number') {
      const current = pockets[pocketKey];
      return {
        ...goal,
        currentAmount: current,
        isCompleted: current >= goal.targetAmount,
        isSyncedWithMaya: true,
        linkedMayaPocket: pocketKey,
      };
    } else {
      // If pocket didn't exist in Maya, seed it with the goal's amount
      pockets[pocketKey] = goal.currentAmount;
      return {
        ...goal,
        isSyncedWithMaya: true,
        linkedMayaPocket: pocketKey,
      };
    }
  });

  // Calculate Maya's total balance as the sum of all its pockets
  const totalMayaBalance = Object.values(pockets).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);

  const updatedAccounts = accounts.map((acc, idx) => {
    if (idx !== mayaIndex) return acc;
    return {
      ...acc,
      mayaPockets: pockets,
      balance: totalMayaBalance,
      lastUpdated: Date.now(),
    };
  });

  return {
    updatedAccounts,
    updatedSavingsGoals: updatedGoals,
  };
}

/**
 * Synchronizes Maya pockets with corresponding Maya savings goals.
 */
export function syncSavingsGoalsWithMayaPockets(
  goals: SavingsGoal[],
  mayaPockets: MayaPockets
): SavingsGoal[] {
  return goals.map((goal) => {
    if (!isGoalSyncedWithMaya(goal)) {
      return goal;
    }

    const pocketKey = getLinkedMayaPocketKey(goal);
    const current = mayaPockets[pocketKey] !== undefined ? mayaPockets[pocketKey] : goal.currentAmount;

    return {
      ...goal,
      currentAmount: current,
      isCompleted: current >= goal.targetAmount,
      isSyncedWithMaya: true,
      linkedMayaPocket: pocketKey,
    };
  });
}

/**
 * Synchronizes accounts when a savings goal is updated directly (e.g. deposit or withdraw)
 */
export function syncAccountWhenGoalUpdated(
  accounts: OnlineAccount[],
  goal: SavingsGoal,
  actionType: 'deposit' | 'withdraw',
  amount: number,
  sourceWalletId?: OnlineAppId
): {
  updatedAccounts: OnlineAccount[];
  updatedPockets?: MayaPockets;
} {
  const isMaya = isGoalSyncedWithMaya(goal);

  if (!isMaya) {
    if (sourceWalletId) {
      const delta = actionType === 'deposit' ? -amount : amount;
      const updatedAccounts = accounts.map((acc) => {
        if (acc.id === sourceWalletId) {
          return {
            ...acc,
            balance: Math.max(0, acc.balance + delta),
            lastUpdated: Date.now(),
          };
        }
        return acc;
      });
      return { updatedAccounts };
    }
    return { updatedAccounts: accounts };
  }

  // Determine Maya pocket key
  const pocketKey = getLinkedMayaPocketKey(goal);
  let updatedPockets: MayaPockets | undefined = undefined;

  const updatedAccounts = accounts.map((acc) => {
    // If source wallet is different from Maya (e.g. deposited from GoTyme into Maya)
    if (sourceWalletId && sourceWalletId !== 'maya' && acc.id === sourceWalletId) {
      const sourceDelta = actionType === 'deposit' ? -amount : amount;
      return {
        ...acc,
        balance: Math.max(0, acc.balance + sourceDelta),
        lastUpdated: Date.now(),
      };
    }

    if (acc.id === 'maya') {
      const pockets: MayaPockets = {
        emergencyFund: 0,
        firstMilly: 0,
        travel: 0,
        ...(acc.mayaPockets || {}),
      };

      const currentVal = pockets[pocketKey] || 0;
      const delta = actionType === 'deposit' ? amount : -amount;
      pockets[pocketKey] = Math.max(0, currentVal + delta);
      updatedPockets = pockets;

      const newTotal = Object.values(pockets).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);

      return {
        ...acc,
        mayaPockets: pockets,
        balance: newTotal,
        lastUpdated: Date.now(),
      };
    }

    return acc;
  });

  return {
    updatedAccounts,
    updatedPockets,
  };
}

/**
 * Synchronizes Maya when a new savings goal is created.
 */
export function syncMayaWhenGoalCreated(
  accounts: OnlineAccount[],
  goal: SavingsGoal
): {
  updatedAccounts: OnlineAccount[];
  updatedGoal: SavingsGoal;
} {
  const isSynced = isGoalSyncedWithMaya(goal);
  if (!isSynced) {
    return { updatedAccounts: accounts, updatedGoal: goal };
  }

  const pocketKey = getLinkedMayaPocketKey(goal);
  const updatedGoal: SavingsGoal = {
    ...goal,
    isSyncedWithMaya: true,
    linkedMayaPocket: pocketKey,
  };

  const updatedAccounts = accounts.map((acc) => {
    if (acc.id !== 'maya') return acc;
    const pockets: MayaPockets = {
      emergencyFund: 0,
      firstMilly: 0,
      travel: 0,
      ...(acc.mayaPockets || {}),
    };
    pockets[pocketKey] = (pockets[pocketKey] || 0) + (goal.currentAmount || 0);
    const total = Object.values(pockets).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);

    return {
      ...acc,
      mayaPockets: pockets,
      balance: total,
      lastUpdated: Date.now(),
    };
  });

  return { updatedAccounts, updatedGoal };
}

/**
 * Synchronizes Maya when a savings goal is deleted.
 */
export function syncMayaWhenGoalDeleted(
  accounts: OnlineAccount[],
  deletedGoal: SavingsGoal
): OnlineAccount[] {
  if (!isGoalSyncedWithMaya(deletedGoal)) {
    return accounts;
  }

  const pocketKey = getLinkedMayaPocketKey(deletedGoal);

  return accounts.map((acc) => {
    if (acc.id !== 'maya') return acc;
    if (!acc.mayaPockets || acc.mayaPockets[pocketKey] === undefined) return acc;

    const pockets = { ...acc.mayaPockets };
    // Deduct the goal's amount from Maya's total
    pockets[pocketKey] = Math.max(0, (pockets[pocketKey] || 0) - deletedGoal.currentAmount);
    const total = Object.values(pockets).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);

    return {
      ...acc,
      mayaPockets: pockets,
      balance: total,
      lastUpdated: Date.now(),
    };
  });
}
