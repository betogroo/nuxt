const fs = require('fs');
let code = fs.readFileSync('app/pages/login.vue', 'utf8');

code = code.replace(
  /<UiOtpInput v-model="otpCode" @finish="handleVerifyOtp" \/>/,
  `<UiOtpInput
            v-model="otpCode"
            v-bind="otpCodeProps"
            @finish="handleVerifyOtp"
          />
          <div v-if="otpErrors.otpCode" class="text-error text-caption text-center mt-2">{{ otpErrors.otpCode }}</div>`
);

fs.writeFileSync('app/pages/login.vue', code, 'utf8');
console.log('Fixed otp input');
