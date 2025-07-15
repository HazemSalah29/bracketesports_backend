# BracketEsports Updated Tournament & Monetization Model - Compliance Documentation

## 🚨 **IMPORTANT MODEL CHANGE - Riot API Compliance Update**

---

## 📋 **Updated Tournament Model Overview**

### **New Compliance Structure**

**Two Distinct Tournament Types:**

1. **🆓 Free Tournaments (Entry Fee: $0)**

   - ✅ **Prizes Allowed**: Creator or sponsor funded
   - ✅ **Prize Range**: $0 - $10,000+ (sponsor dependent)
   - ✅ **Prize Source**: External funding only (not from entry fees)
   - ✅ **Available to**: All users (players and creators)

2. **💰 Paid Tournaments (Entry Fee: $5-20)**
   - ❌ **No Prizes**: Entry fees are NOT used for prizes
   - ✅ **Creator Revenue**: 70% of entry fees go to creator
   - ✅ **Platform Revenue**: 30% platform commission
   - ⚠️ **Creator Only**: Only verified creators can host paid tournaments
   - ✅ **Purpose**: Creator monetization, community events, exclusive access

---

## 🔄 **Updated Riot API Compliance Responses**

### **1. Buy-ins and Prize Separation**

**Entry Fees (Buy-ins):**

- **Maximum**: $20 USD per participant
- **Minimum**: $5 USD per participant (for paid tournaments)
- **Alternative**: $0 USD (free tournaments with external prizes)
- **Restriction**: Only verified content creators can host paid tournaments

**Prize Pool Policy:**

- **Paid Tournaments**: **0% of entry fees** go to prizes
- **Free Tournaments**: Prizes funded externally by creators/sponsors
- **Clear Separation**: Entry fees and prizes are completely separate systems

### **2. Entry Fee Usage Breakdown**

```javascript
// Entry Fee Distribution (Paid Tournaments Only)
totalEntryFees: 100%
platformCommission: 30% // Infrastructure, compliance, operations
creatorRevenue: 70% // Creator monetization (NOT prizes)
prizePool: 0% // NO prizes from entry fees

// Example: 64 participants × $20 entry fee = $1,280 total
platformRevenue: $384 (30%)
creatorRevenue: $896 (70%)
prizes: $0 (funded separately if desired)
```

### **3. Prize Pool Sources (Free Tournaments Only)**

**External Prize Funding:**

- Creator personal funding
- Sponsor partnerships
- Brand collaborations
- Community donations
- Platform promotional events

**Prize Pool Range:**

- **Minimum**: $0 (no requirement for prizes)
- **Maximum**: Unlimited (sponsor/creator dependent)
- **Typical Range**: $100-2,000 per tournament
- **Funding Verification**: Required documentation for prize sources

### **4. Updated Virtual Currency Policy**

**Coin System Compliance:**

- **Entry Fee Payment**: Coins can be used for tournament entry
- **Prize Prohibition**: Coins CANNOT be awarded as prizes
- **One-Way System**: Coins cannot be converted back to fiat
- **Purchase Only**: Fixed rate of $0.01 USD per coin
- **Compliance**: Meets virtual currency guidelines

### **5. Tournament Structure Requirements**

**Minimum Participants**: 20 individuals (unchanged)

- Enforced for both free and paid tournaments
- Riot API compliance maintained

**Team Size Flexibility**:

- **Individual**: 1 player (battle royale, solo competitions)
- **Team**: 2-10 players (traditional team games)
- **Most Common**: 5 players (League of Legends, Valorant)

### **6. Tournament Scheduling & Structure**

**Format Support** (unchanged):

- Single Elimination (65%)
- Double Elimination (25%)
- Round Robin (8%)
- Swiss System (2%)

**Minimum Games**: 5 rounds minimum for all formats

**Progression**: Direct head-to-head competition only

### **7. Regional Operations**

**Global Coverage**:

- North America (NA1) - 45%
- Europe (EUW1, EUN1, TR1, RU) - 30%
- Asia (KR, JP1) - 20%
- Other regions (BR1, LAN, LAS, OCE1) - 5%

### **8. Updated Prize Pool Limits**

**Free Tournaments**:

- **Maximum Prize Pool**: Unlimited (sponsor funded)
- **Typical Range**: $100-2,000
- **Source Verification**: Required for prizes over $500

**Paid Tournaments**:

- **Prize Pool**: $0 (entry fees not used for prizes)
- **Creator Benefit**: Direct monetization through entry fees

---

## 🛡️ **Enhanced Compliance Measures**

### **Tournament Creation Validation**

```javascript
// Updated validation logic
validateTournament(data) {
  if (data.entryFee > 0) {
    // Paid tournament rules
    if (data.entryFee > 20) return "Entry fee cannot exceed $20";
    if (data.prizePool > 0) return "Paid tournaments cannot have prize pools";
    if (!user.isCreator) return "Only creators can host paid tournaments";
  } else {
    // Free tournament rules
    if (data.prizePool > 0) {
      if (!data.prizeSource) return "Prize source documentation required";
      if (data.prizeSource === "entry_fees") return "Prizes cannot come from entry fees";
    }
  }
  return "Valid";
}
```

### **Audit Trail Requirements**

**Paid Tournaments**:

- Entry fee collection tracking
- Creator revenue distribution logs
- Platform commission records

**Free Tournaments with Prizes**:

- Prize source documentation
- Sponsor agreement verification
- Prize distribution confirmation

### **User Interface Requirements**

**Clear Separation Display**:

```
[Free Tournament]
Entry Fee: $0
Prize Pool: $500 (Sponsored by TechBrand)
Source: External Sponsor

[Paid Tournament]
Entry Fee: $15
Prize Pool: No Prizes
Creator Revenue: Tournament host monetization
```

---

## 📊 **Business Impact Analysis**

### **Revenue Model Changes**

**Before**: Mixed model with entry fees funding prizes
**After**: Clear separation - entry fees for creators, external prizes for engagement

**Benefits**:

1. **Regulatory Compliance**: Eliminates any gambling concerns
2. **Creator Incentives**: Direct monetization path for content creators
3. **Sponsor Opportunities**: Clear value proposition for brand partnerships
4. **User Choice**: Free tournaments with prizes OR paid exclusive events

### **Expected Outcomes**

**Free Tournaments** (80% of volume):

- Higher participation due to external prizes
- Better sponsor engagement
- Community building focus
- User acquisition driver

**Paid Tournaments** (20% of volume):

- Creator monetization focus
- Exclusive/premium experiences
- Content creation opportunities
- Sustainable creator economy

---

## ✅ **Compliance Checklist**

- ✅ Entry fees capped at $20 USD
- ✅ No prize pools from entry fees
- ✅ Clear separation of fees and prizes
- ✅ Creator-only paid tournament hosting
- ✅ External prize source verification
- ✅ Minimum 20 participants enforced
- ✅ Traditional tournament formats only
- ✅ Virtual currency compliance (no fiat conversion)
- ✅ Regional server routing
- ✅ Automated compliance monitoring
- ✅ Audit trail for all transactions
- ✅ Clear user interface separation

---

## 🚀 **Implementation Requirements**

### **Database Schema Updates**

```javascript
Tournament: {
  entryFee: Number, // 0 or 5-20
  prizePool: Number, // 0 for paid tournaments
  prizeSource: String, // Required if prizePool > 0
  sponsorInfo: Object, // Sponsor details for free tournaments
  isCreatorOnly: Boolean, // True for paid tournaments
  revenueDistribution: {
    platform: Number,
    creator: Number,
    prizes: Number // Always 0 for paid
  }
}
```

### **API Endpoint Updates**

**Tournament Creation**:

- Validate creator status for paid tournaments
- Require prize source documentation
- Enforce entry fee limits

**Prize Management**:

- Separate prize pool management
- Sponsor verification system
- External funding tracking

---

## 📞 **Support Documentation**

### **For Creators**

**Paid Tournaments**:

- Focus on exclusive content, early access, special events
- Market as "creator support" rather than prize competition
- Emphasize community building and content creation

**Free Tournaments**:

- Partner with sponsors for prize funding
- Document all external prize sources
- Focus on community engagement and growth

### **For Sponsors**

**Prize Partnership**:

- Clear brand visibility in free tournaments
- Documented partnership agreements
- Performance metrics and ROI tracking

---

_Compliance Update Completed: July 15, 2025_  
_Next Review: August 15, 2025_  
_Riot API Status: ✅ Fully Compliant_
