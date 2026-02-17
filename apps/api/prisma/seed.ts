import { Prisma, PrismaClient, type LedgerAccountType } from '@prisma/client';
import { hash } from 'bcryptjs';
import { DEFAULT_LENDER_ID, DEFAULT_LENDER_NAME, DEFAULT_LENDER_SLUG } from '../src/common/tenant/tenant.constants';

const prisma = new PrismaClient();

type SeedAccount = {
  code: string;
  name: string;
  type: LedgerAccountType;
};

type PermissionSeed = {
  code: string;
  name: string;
  description: string;
};

const CHART_OF_ACCOUNTS: SeedAccount[] = [
  { code: '1000', name: 'Cash at Bank', type: 'ASSET' },
  { code: '1100', name: 'Loans Receivable', type: 'ASSET' },
  { code: '1200', name: 'Penalties Receivable', type: 'ASSET' },
  { code: '2000', name: 'Customer Payables', type: 'LIABILITY' },
  { code: '3000', name: 'Owner Equity', type: 'EQUITY' },
  { code: '4000', name: 'Interest Income', type: 'INCOME' },
  { code: '4100', name: 'Fee Income', type: 'INCOME' },
  { code: '4200', name: 'Penalty Income', type: 'INCOME' },
  { code: '5000', name: 'Operating Expense', type: 'EXPENSE' }
];

const PERMISSIONS: PermissionSeed[] = [
  { code: 'LOANS_APPROVE', name: 'Approve loans', description: 'Approve or reject loan applications' },
  { code: 'DISBURSEMENTS_MANAGE', name: 'Manage disbursements', description: 'Initiate and transition disbursements' },
  { code: 'BORROWERS_READ', name: 'Read borrowers', description: 'View borrower records' },
  { code: 'BORROWERS_WRITE', name: 'Manage borrowers', description: 'Create notes and overrides for borrowers' },
  { code: 'UNDERWRITING_EDIT', name: 'Edit underwriting', description: 'Update underwriting cases and checklist' },
  { code: 'AUDIT_EXPORT', name: 'Export audit logs', description: 'Export audit logs as CSV' },
  { code: 'JOBS_RETRY', name: 'Retry jobs', description: 'Retry failed and dead jobs' },
  { code: 'ROLES_VIEW', name: 'View roles', description: 'View role to permission mapping' },
  { code: 'ADMIN_USERS_ROLE_ASSIGN', name: 'Assign admin role', description: 'Assign roles to admin users' },
  { code: 'LENDER_SETTINGS_EDIT', name: 'Edit lender settings', description: 'Edit lender policy and settings' },
  { code: 'ADMIN_USERS_VIEW', name: 'View admin users', description: 'View admin user directory and activity' },
  { code: 'ADMIN_USERS_MANAGE', name: 'Manage admin users', description: 'Create staff, suspend users, and reset invites' },
  { code: 'REPORTS_VIEW', name: 'View reports', description: 'View tenant KPI reporting dashboards' },
  { code: 'RISK_VIEW', name: 'View risk profile', description: 'View borrower fraud and risk signals' }
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: PERMISSIONS.map((permission) => permission.code),
  OPS: [
    'LOANS_APPROVE',
    'DISBURSEMENTS_MANAGE',
    'BORROWERS_READ',
    'BORROWERS_WRITE',
    'UNDERWRITING_EDIT',
    'JOBS_RETRY',
    'ROLES_VIEW',
    'ADMIN_USERS_VIEW',
    'ADMIN_USERS_MANAGE',
    'REPORTS_VIEW',
    'RISK_VIEW'
  ],
  FINANCE: [
    'LOANS_APPROVE',
    'DISBURSEMENTS_MANAGE',
    'BORROWERS_READ',
    'AUDIT_EXPORT',
    'ROLES_VIEW',
    'ADMIN_USERS_VIEW',
    'REPORTS_VIEW',
    'RISK_VIEW'
  ],
  VIEWER: ['BORROWERS_READ', 'ROLES_VIEW', 'ADMIN_USERS_VIEW', 'REPORTS_VIEW', 'RISK_VIEW']
};

async function main(): Promise<void> {
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {
      name: 'Demo Lender',
      lenderTitle: 'Demo',
      apiBaseUrl: null
    },
    create: {
      slug: 'demo',
      name: 'Demo Lender',
      lenderTitle: 'Demo',
      apiBaseUrl: null
    }
  });

  const fallbackTenant = await prisma.tenant.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true }
  });
  const tenantForAdmin = demoTenant ?? fallbackTenant;
  if (tenantForAdmin) {
    await prisma.tenantAdminUser.upsert({
      where: {
        tenantId_email: {
          tenantId: tenantForAdmin.id,
          email: 'admin@demo.com'
        }
      },
      update: {
        passwordHash: await hash('Admin123!', 10),
        role: 'TENANT_ADMIN'
      },
      create: {
        tenantId: tenantForAdmin.id,
        email: 'admin@demo.com',
        passwordHash: await hash('Admin123!', 10),
        role: 'TENANT_ADMIN'
      }
    });
  }

  await prisma.lender.upsert({
    where: { slug: 'demo' },
    update: {
      name: 'Demo Lender',
      status: 'ACTIVE',
      settings: {
        branding: {
          displayName: 'Demo Lender',
          logoUrl: null,
          primaryColor: '#0f766e'
        }
      } as Prisma.InputJsonValue
    },
    create: {
      name: 'Demo Lender',
      slug: 'demo',
      status: 'ACTIVE',
      settings: {
        branding: {
          displayName: 'Demo Lender',
          logoUrl: null,
          primaryColor: '#0f766e'
        }
      } as Prisma.InputJsonValue
    }
  });

  await prisma.lender.upsert({
    where: { id: DEFAULT_LENDER_ID },
    update: {
      name: DEFAULT_LENDER_NAME,
      slug: DEFAULT_LENDER_SLUG,
      status: 'ACTIVE'
    },
    create: {
      id: DEFAULT_LENDER_ID,
      name: DEFAULT_LENDER_NAME,
      slug: DEFAULT_LENDER_SLUG,
      status: 'ACTIVE',
      settings: Prisma.JsonNull
    }
  });

  for (const account of CHART_OF_ACCOUNTS) {
    await prisma.ledgerAccount.upsert({
      where: { code: account.code },
      update: {
        name: account.name,
        type: account.type,
        isActive: true
      },
      create: {
        code: account.code,
        name: account.name,
        type: account.type,
        isActive: true
      }
    });
  }

  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        name: permission.name,
        description: permission.description
      },
      create: permission
    });
  }

  const lenders = await prisma.lender.findMany({
    select: { id: true }
  });

  for (const lender of lenders) {
    await seedRbacForLender(lender.id);
  }
}

async function seedRbacForLender(lenderId: string): Promise<void> {
  const permissions = await prisma.permission.findMany({
    select: { id: true, code: true }
  });
  const permissionByCode = new Map(permissions.map((permission) => [permission.code, permission.id]));

  for (const roleName of ['OWNER', 'OPS', 'FINANCE', 'VIEWER']) {
    const role = await prisma.role.upsert({
      where: {
        lenderId_name: {
          lenderId,
          name: roleName
        }
      },
      update: {},
      create: {
        lenderId,
        name: roleName,
        isSystem: true,
        description: `${roleName} default role`
      }
    });

    for (const permissionCode of DEFAULT_ROLE_PERMISSIONS[roleName]) {
      const permissionId = permissionByCode.get(permissionCode);
      if (!permissionId) {
        continue;
      }
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId
        }
      });
    }
  }

  const ownerRole = await prisma.role.findUnique({
    where: {
      lenderId_name: {
        lenderId,
        name: 'OWNER'
      }
    },
    select: { id: true }
  });
  const opsRole = await prisma.role.findUnique({
    where: {
      lenderId_name: {
        lenderId,
        name: 'OPS'
      }
    },
    select: { id: true }
  });
  const financeRole = await prisma.role.findUnique({
    where: {
      lenderId_name: {
        lenderId,
        name: 'FINANCE'
      }
    },
    select: { id: true }
  });
  const viewerRole = await prisma.role.findUnique({
    where: {
      lenderId_name: {
        lenderId,
        name: 'VIEWER'
      }
    },
    select: { id: true }
  });

  const admins = await prisma.adminUser.findMany({
    where: { lenderId },
    select: { id: true, role: true }
  });

  for (const admin of admins) {
    let roleId = ownerRole?.id;
    if (admin.role === 'OPS') {
      roleId = opsRole?.id;
    } else if (admin.role === 'FINANCE') {
      roleId = financeRole?.id;
    } else if (admin.role === 'VIEWER') {
      roleId = viewerRole?.id;
    }

    if (!roleId) {
      continue;
    }

    await prisma.adminRoleAssignment.upsert({
      where: {
        adminUserId: admin.id
      },
      update: {
        lenderId,
        roleId
      },
      create: {
        lenderId,
        adminUserId: admin.id,
        roleId
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
