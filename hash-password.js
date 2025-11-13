const bcrypt = require("bcrypt");

async function updateAdminPassword() {
  const email = "admin@platform.com";
  const password = "Admin123!";
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`New Hash: ${hashedPassword}`);
  console.log("\n=== RUN THIS SQL TO FIX THE PASSWORD ===");
  console.log(
    `UPDATE users SET password = '${hashedPassword}' WHERE email = '${email}';`
  );
  console.log("\n=== VERIFY THE UPDATE ===");
  console.log(`SELECT email, role FROM users WHERE email = '${email}';`);

  // Test the hash works
  const isMatch = await bcrypt.compare(password, hashedPassword);
  console.log("\nPassword verification test:", isMatch);
}

updateAdminPassword();
