const fs = require('fs');
let code = fs.readFileSync('app/pages/login.vue', 'utf8');

code = code.replace(/const \[emailOtp, emailOtpProps\] = otpDefine\('email'\)/, "const [emailOtp] = otpDefine('email')");

fs.writeFileSync('app/pages/login.vue', code, 'utf8');
console.log('Fixed unused');
