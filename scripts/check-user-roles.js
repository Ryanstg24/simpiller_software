// Script to check a user's roles and why they're seeing all patients
// Usage: node scripts/check-user-roles.js <user-email>

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserRoles(email) {
  console.log('\n🔍 Checking roles for user:', email);
  console.log('='.repeat(60));

  // Get user by email
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, is_active')
    .eq('email', email);

  if (userError || !users || users.length === 0) {
    console.error('❌ User not found:', email);
    return;
  }

  const user = users[0];
  console.log('\n✅ User found:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Name: ${user.first_name} ${user.last_name}`);
  console.log(`   Active: ${user.is_active}`);

  // Get role assignments
  const { data: assignments, error: assignError } = await supabase
    .from('user_role_assignments')
    .select('role_id')
    .eq('user_id', user.id);

  if (assignError || !assignments || assignments.length === 0) {
    console.log('\n⚠️  No role assignments found for this user');
    return;
  }

  console.log(`\n📋 Found ${assignments.length} role assignment(s)`);

  // Get role details
  const roleIds = assignments.map(a => a.role_id);
  const { data: roles, error: roleError } = await supabase
    .from('user_roles')
    .select('id, name, organization_id, facility_id')
    .in('id', roleIds);

  if (roleError || !roles) {
    console.error('❌ Error fetching role details:', roleError);
    return;
  }

  console.log('\n🎭 User Roles:');
  console.log('='.repeat(60));
  
  let hasSimpillerAdmin = false;
  let hasOrgAdmin = false;
  let orgAdminOrgId = null;

  roles.forEach((role, index) => {
    console.log(`\n${index + 1}. Role: ${role.name}`);
    console.log(`   ID: ${role.id}`);
    console.log(`   Organization ID: ${role.organization_id || 'N/A'}`);
    console.log(`   Facility ID: ${role.facility_id || 'N/A'}`);

    if (role.name === 'simpiller_admin') {
      hasSimpillerAdmin = true;
    }
    if (role.name === 'organization_admin') {
      hasOrgAdmin = true;
      orgAdminOrgId = role.organization_id;
    }
  });

  // Analysis
  console.log('\n📊 Analysis:');
  console.log('='.repeat(60));
  
  if (hasSimpillerAdmin) {
    console.log('✅ Has simpiller_admin role → Will see ALL patients');
    if (hasOrgAdmin) {
      console.log('⚠️  ALSO has organization_admin role');
      console.log('   → This is the problem! Simpiller admin check comes first');
      console.log(`   → Organization admin would restrict to org: ${orgAdminOrgId}`);
    }
  } else if (hasOrgAdmin) {
    console.log(`✅ Has organization_admin role for org: ${orgAdminOrgId}`);
    console.log(`   → Should only see patients in organization: ${orgAdminOrgId}`);
    
    // Check if org ID is valid
    if (!orgAdminOrgId) {
      console.log('❌ ERROR: Organization ID is NULL!');
      console.log('   → This will prevent filtering - user will see NO patients');
    }
  } else {
    console.log('ℹ️  User has other roles (provider/billing)');
  }

  // Recommendation
  console.log('\n💡 Recommendation:');
  console.log('='.repeat(60));
  
  if (hasSimpillerAdmin && hasOrgAdmin) {
    console.log('🔧 REMOVE the simpiller_admin role if this user should only see');
    console.log(`   patients from organization ${orgAdminOrgId}`);
    console.log('\n   SQL to fix:');
    console.log(`   DELETE FROM user_role_assignments`);
    console.log(`   WHERE user_id = '${user.id}'`);
    console.log(`   AND role_id IN (`);
    console.log(`     SELECT id FROM user_roles WHERE name = 'simpiller_admin'`);
    console.log(`   );`);
  } else if (hasOrgAdmin && !orgAdminOrgId) {
    console.log('🔧 UPDATE the organization_admin role to have an organization_id');
    console.log('\n   First, find the correct role ID with org set:');
    console.log(`   SELECT id, organization_id FROM user_roles`);
    console.log(`   WHERE name = 'organization_admin' AND organization_id IS NOT NULL;`);
  } else {
    console.log('✅ Role configuration looks correct');
  }

  console.log('\n');
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/check-user-roles.js <user-email>');
  process.exit(1);
}

checkUserRoles(email).catch(console.error);

