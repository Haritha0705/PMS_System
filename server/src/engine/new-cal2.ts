type Role = "PGM" | "PAGM" | "PPH" | "PRM" | "PM";

interface RoleConfig {
    role: Role;
    annualTarget: number;
    monthlyTarget: number;
    annualSalary: number;
    monthlySalary: number;
}

const ROLE_CONFIG: Record<Role, RoleConfig> = {
    PGM: {
        role: "PGM",
        annualTarget: 8_100_000_000,
        monthlyTarget: 675_000_000,
        annualSalary: 8_400_000,
        monthlySalary: 700_000,
    },
    PAGM: {
        role: "PAGM",
        annualTarget: 2_700_000_000,
        monthlyTarget: 225_000_000,
        annualSalary: 7_500_000,
        monthlySalary: 625_000,
    },
    PPH: {
        role: "PPH",
        annualTarget: 900_000_000,
        monthlyTarget: 75_000_000,
        annualSalary: 6_600_000,
        monthlySalary: 550_000,
    },
    PRM: {
        role: "PRM",
        annualTarget: 180_000_000,
        monthlyTarget: 15_000_000,
        annualSalary: 4_200_000,
        monthlySalary: 350_000,
    },
    PM: {
        role: "PM",
        annualTarget: 18_000_000,
        monthlyTarget: 1_500_000,
        annualSalary: 1_800_000,
        monthlySalary: 150_000,
    },
};

interface EmployeePerformance {
    role: Role;
    month: number;            // overall month counter (never resets)
    cycle: number;            // annual cycle number (1, 2, 3 ...)
    cycleMonth: number;       // months finished inside the current annual cycle (0 - 11)
    totalAchieved: number;    // achieved inside the current annual cycle
    totalSalaryPaid: number;  // salary paid inside the current annual cycle
    carryForward: number;     // extra achievement carried to next month
}

interface MonthlyResult {
    role: Role;
    month: number;
    cycle: number;
    cycleMonth: number;

    monthlyTarget: number;
    previousCarryForward: number;
    adjustedTarget: number;

    actualAchievement: number;
    achievementPercentage: number;
    extraAchievement: number;

    monthlySalary: number;
    salaryEarned: number;

    annualTarget: number;
    totalAchieved: number;
    remainingTarget: number;

    annualSalary: number;
    totalSalaryPaid: number;
    remainingSalary: number;

    carryForward: number;
    annualTargetCompleted: boolean;

    // true when annualTarget / annualSalary are refreshed for the next month
    cycleRefreshed: boolean;

    // state to store and pass to the next month's calculation
    nextState: EmployeePerformance;
}

const round2 = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100;

function calculateMonthlySalary(
    role: Role,
    actualAchievement: number,
    previous: EmployeePerformance
): MonthlyResult {

    const config = ROLE_CONFIG[role];

    if (!Number.isFinite(actualAchievement) || actualAchievement < 0) {
        throw new Error("Invalid achievement amount");
    }

    if (previous.role !== role) {
        throw new Error("Employee role does not match performance record");
    }

    if (
        !Number.isInteger(previous.cycleMonth) ||
        previous.cycleMonth < 0 ||
        previous.cycleMonth >= 12
    ) {
        throw new Error("Invalid cycle month");
    }

    const {
        annualTarget,
        monthlyTarget,
        annualSalary,
        monthlySalary,
    } = config;

    const cycleMonth = previous.cycleMonth + 1;

    // 1. Remaining annual amounts in the current cycle
    const remainingTarget = Math.max(0, annualTarget - previous.totalAchieved);
    const remainingSalary = Math.max(0, annualSalary - previous.totalSalaryPaid);

    // 2. This month's target = monthlyTarget minus previous carry-forward
    //    (never more than what is left of the annual target)
    const adjustedTarget = Math.min(
        remainingTarget,
        Math.max(0, monthlyTarget - previous.carryForward)
    );

    // 3. Annual progress
    const acceptedAchievement = Math.min(actualAchievement, remainingTarget);
    const totalAchieved = previous.totalAchieved + acceptedAchievement;

    // 4. Annual target completed this month?
    const annualTargetCompleted = totalAchieved >= annualTarget;

    // 5. Achievement percentage against this month's target
    const achievementPercentage = adjustedTarget === 0
        ? 100
        : Math.min(100, (actualAchievement / adjustedTarget) * 100);

    // 6. Salary
    let salaryEarned: number;

    if (annualTargetCompleted) {
        // Annual target done -> pay all remaining annual salary
        salaryEarned = remainingSalary;
    } else {
        // Below target -> percentage of monthlySalary
        // On / over target -> full monthlySalary
        salaryEarned = Math.min(
            monthlySalary * (achievementPercentage / 100),
            remainingSalary
        );
    }
    salaryEarned = round2(salaryEarned);

    // 7. Carry-forward
    //    Carry larger than one monthlyTarget is consumed one month at a time.
    const previousCarryUsed = Math.min(previous.carryForward, monthlyTarget);
    const unusedPreviousCarry = previous.carryForward - previousCarryUsed;

    // Extra = achievement above this month's target
    //   (in the completion month: only the part above the annual target,
    //    which moves to the new cycle)
    const extraAchievement = annualTargetCompleted
        ? Math.max(0, actualAchievement - remainingTarget)
        : Math.max(0, actualAchievement - adjustedTarget);

    const carryForward = annualTargetCompleted
        ? extraAchievement
        : unusedPreviousCarry + extraAchievement;

    // 8. Totals for this cycle
    const totalSalaryPaid = round2(previous.totalSalaryPaid + salaryEarned);

    // 9. Refresh annualTarget / annualSalary when the annual target is
    //    completed or the 12-month cycle ends
    const cycleRefreshed = annualTargetCompleted || cycleMonth >= 12;

    const nextState: EmployeePerformance = cycleRefreshed
        ? {
            role,
            month: previous.month + 1,
            cycle: previous.cycle + 1,
            cycleMonth: 0,
            totalAchieved: 0,
            totalSalaryPaid: 0,
            // keep extra over the annual target; drop carry at plain year-end
            carryForward: annualTargetCompleted ? carryForward : 0,
        }
        : {
            role,
            month: previous.month + 1,
            cycle: previous.cycle,
            cycleMonth,
            totalAchieved,
            totalSalaryPaid,
            carryForward,
        };

    return {
        role,
        month: previous.month + 1,
        cycle: previous.cycle,
        cycleMonth,

        monthlyTarget,
        previousCarryForward: previous.carryForward,
        adjustedTarget,

        actualAchievement,
        achievementPercentage: round2(achievementPercentage),
        extraAchievement,

        monthlySalary,
        salaryEarned,

        annualTarget,
        totalAchieved,
        remainingTarget: Math.max(0, annualTarget - totalAchieved),

        annualSalary,
        totalSalaryPaid,
        remainingSalary: round2(Math.max(0, annualSalary - totalSalaryPaid)),

        carryForward: nextState.carryForward,
        annualTargetCompleted,
        cycleRefreshed,

        nextState,
    };
}

// ==========================================
// EMPLOYEE INITIAL STATE
// ==========================================

let employee: EmployeePerformance = {
    role: "PGM",
    month: 0,
    cycle: 1,
    cycleMonth: 0,
    totalAchieved: 0,
    totalSalaryPaid: 0,
    carryForward: 0,
};

// ==========================================
// HELPER: PROCESS MONTH
// ==========================================

function processMonth(achievement: number): MonthlyResult {

    const result = calculateMonthlySalary(employee.role, achievement, employee);

    const { nextState, ...display } = result;
    console.log(`Month ${result.month}:`, display);

    // Store the (possibly refreshed) state for next month
    employee = nextState;

    return result;
}

// ==========================================
// JANUARY  - 70% of monthlyTarget -> 70% of monthlySalary
// ==========================================

const january = processMonth(472_500_000);

// ==========================================
// FEBRUARY - completes annualTarget -> remaining annualSalary, cycle refreshes
// ==========================================

const february = processMonth(7_627_500_000);

// ==========================================
// MARCH    - new cycle: fresh annualTarget / annualSalary
// ==========================================

const march = processMonth(472_500_000);

// ==========================================
// APRIL    - over monthlyTarget -> full salary, extra carried to May
// ==========================================

const april = processMonth(800_000_000);

// ==========================================
// MAY      - target reduced by April's extra
// ==========================================

const may = processMonth(550_000_000);