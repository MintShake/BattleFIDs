// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// OpenZeppelin
import {ERC1155}       from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC2981}       from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable}      from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20}        from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Strings}       from "@openzeppelin/contracts/utils/Strings.sol";

// ─────────────────────────────────────────────────────────────────────────────
// Minimal Pyth Entropy interface (v2)
// Docs: docs.pyth.network/entropy
// ─────────────────────────────────────────────────────────────────────────────
interface IEntropy {
    function requestWithCallback(
        address provider,
        bytes32 userRandomNumber
    ) external payable returns (uint64 sequenceNumber);

    function getFee(address provider) external view returns (uint128 feeAmount);
    function getDefaultProvider() external view returns (address);
}

// ─────────────────────────────────────────────────────────────────────────────
// TheProtocol — Farcaster identity card packs · Base mainnet
//
// Randomness design:
//   • Seed zero: keccak256(abi.encodePacked(uint256(10)))  ← agreed first value
//   • Every pack: userRandom = keccak256(lastEntropy, packId)
//     This is unique per request even before the previous callback fires.
//   • After each Pyth callback: lastEntropy = randomNumber
//     The chain auto-advances with Pyth's own entropy — no frontend needed.
//
// Oracle fee design:
//   • Pyth fee paid from the contract's ETH balance.
//   • Buyer pays USDC only — no ETH required from the user.
//   • Admin tops up contract with receive() ETH as needed (~$0.001 per pack).
//
// Deploy checklist:
//   1. Get Pyth Entropy address from docs.pyth.network/entropy/contract-addresses
//      Base mainnet: 0x36825bf3Fbdf5a29E2d5148bfe7Dcf7B5639e320
//   2. Deploy (constructor takes entropy address + optional provider override)
//   3. Fund contract with a small ETH buffer: cast send <addr> --value 0.01ether
//   4. Grant MINTER_ROLE to your server hot wallet
// ─────────────────────────────────────────────────────────────────────────────

contract TheProtocol is ERC1155, ERC2981, AccessControl, ReentrancyGuard, Pausable {
    using Strings for uint256;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant MINTER_ROLE     = keccak256("MINTER_ROLE");
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");

    // ── USDC on Base (6 decimals) ─────────────────────────────────────────────
    IERC20 public constant USDC = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);

    uint256 public constant PRICE_SCROLL = 3_000_000;   // $3
    uint256 public constant PRICE_TABLET = 8_000_000;   // $8
    uint256 public constant PRICE_CODEX  = 25_000_000;  // $25

    // ── Pyth Entropy ──────────────────────────────────────────────────────────
    IEntropy public immutable entropy;
    address  public entropyProvider;  // can be updated by admin

    // Chained seed: starts at keccak256(10), rolls forward with every fulfilled pack.
    bytes32 public lastEntropy = keccak256(abi.encodePacked(uint256(10)));

    // ── Rarity weights (bps out of 10 000, per tier) ──────────────────────────
    // Index: 0=Alpha  1=Legendary  2=Elite  3=Rare  4=Common
    //
    //              Alpha  Legendary  Elite  Rare   Common
    // SCROLL (0)    100     400      1000   2500   6000
    // TABLET (1)    300    1200      2500   4000   2000
    // CODEX  (2)   1000    2500      3000   2500   1000
    //
    // Guarantee — at least one slot must be ≤ this rarity index:
    //   SCROLL → none (255)   TABLET → Elite+(≤2)   CODEX → Legendary+(≤1)

    uint16[5] private W0 = [100,  400,  1000, 2500, 6000];
    uint16[5] private W1 = [300,  1200, 2500, 4000, 2000];
    uint16[5] private W2 = [1000, 2500, 3000, 2500, 1000];

    uint8 private constant GUARANTEE_SCROLL = 255;
    uint8 private constant GUARANTEE_TABLET = 2;
    uint8 private constant GUARANTEE_CODEX  = 1;

    // FID range: [start, start + size)
    uint32[5] private FID_START = [1,   11,  101,  1001,  10001];
    uint32[5] private FID_SIZE  = [10,  90,  900,  9000,  90000];

    // ── Pack state ────────────────────────────────────────────────────────────
    struct Pack {
        address buyer;
        uint8   tier;
        bytes32 seed;      // Pyth combined random — slots derived from this
        bool    fulfilled; // true once entropyCallback fires
        bool    minted;    // true once mintPack succeeds
    }

    uint256 public nextPackId;
    mapping(uint256 => Pack)   public packs;
    mapping(uint64  => uint256) public seqToPack; // Pyth sequenceNumber → packId

    // ── Token metadata ────────────────────────────────────────────────────────
    string public baseURI;  // "https://battle-fids.vercel.app/api/token/"

    mapping(uint256 => uint256) public tokenFid;
    mapping(uint256 => uint256) public tokenSerial;
    mapping(uint256 => uint256) public tokenVariant;

    // ── Supply tracking ───────────────────────────────────────────────────────
    // Max copies of a card = its FID number (FID 17491 → 17 491 possible prints)
    mapping(bytes32 => uint256) public mintCount;   // keccak256(imageId) → minted
    mapping(uint256 => bool)    public tokenMinted; // tokenId → already exists

    // ── Events ────────────────────────────────────────────────────────────────
    event PackPurchased(uint256 indexed packId, address indexed buyer, uint8 indexed tier, uint64 pythSeq);
    event PackFulfilled(uint256 indexed packId, uint32[10] fids, uint32[10] variantHints);
    event PackMinted   (uint256 indexed packId, uint256[] tokenIds);

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    //
    // _entropy          Pyth Entropy contract — docs.pyth.network/entropy/contract-addresses
    //                   Base mainnet: 0x36825bf3Fbdf5a29E2d5148bfe7Dcf7B5639e320
    // _entropyProvider  0x0 → use entropy.getDefaultProvider() (recommended)
    // _baseURI          "https://battle-fids.vercel.app/api/token/"
    // admin             Your wallet — royalties, USDC withdrawals, admin ops
    // minter            Server hot wallet — calls mintPack after Pyth callback
    // ─────────────────────────────────────────────────────────────────────────
    constructor(
        address _entropy,
        address _entropyProvider,
        string  memory _baseURI,
        address admin,
        address minter
    )
        ERC1155(_baseURI)
    {
        entropy         = IEntropy(_entropy);
        entropyProvider = _entropyProvider != address(0)
            ? _entropyProvider
            : IEntropy(_entropy).getDefaultProvider();
        baseURI = _baseURI;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE,        minter);
        _grantRole(WITHDRAWER_ROLE,    admin);

        _setDefaultRoyalty(admin, 500); // 5 % ERC-2981 royalty
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Receive ETH — admin funds the contract to pay Pyth oracle fees
    // ─────────────────────────────────────────────────────────────────────────
    receive() external payable {}

    // ─────────────────────────────────────────────────────────────────────────
    // buyPack — user pays USDC; contract pays Pyth fee from its ETH balance
    //
    // tier: 0=SCROLL $3  1=TABLET $8  2=CODEX $25
    // ─────────────────────────────────────────────────────────────────────────
    function buyPack(uint8 tier)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 packId)
    {
        require(tier < 3, "invalid tier");

        require(
            USDC.transferFrom(msg.sender, address(this), _tierPrice(tier)),
            "USDC transfer failed"
        );

        // packId first — used to make userRandom unique even for concurrent packs
        packId = nextPackId++;

        // userRandom chains from previous Pyth output, differentiated by packId.
        // This means concurrent packs get unique user inputs without needing
        // a commit from the frontend.
        bytes32 userRandom = keccak256(abi.encodePacked(lastEntropy, packId));

        uint128 fee = entropy.getFee(entropyProvider);
        require(address(this).balance >= fee, "top up contract ETH for oracle fees");

        uint64 seq = entropy.requestWithCallback{value: fee}(entropyProvider, userRandom);

        packs[packId] = Pack({
            buyer:     msg.sender,
            tier:      tier,
            seed:      bytes32(0),
            fulfilled: false,
            minted:    false
        });
        seqToPack[seq] = packId;

        emit PackPurchased(packId, msg.sender, tier, seq);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // entropyCallback — called by the Pyth Entropy contract (not callable by anyone else)
    //
    // randomNumber is the final combined entropy: hash(userRandom, providerRandom).
    // We store it as the pack seed AND advance lastEntropy for the next request.
    // ─────────────────────────────────────────────────────────────────────────
    function entropyCallback(
        uint64  sequenceNumber,
        address provider,
        bytes32 randomNumber
    ) external {
        require(msg.sender == address(entropy), "only Pyth Entropy");
        require(provider == entropyProvider,    "wrong provider");

        uint256 packId    = seqToPack[sequenceNumber];
        Pack storage pack = packs[packId];

        pack.seed      = randomNumber;
        pack.fulfilled = true;

        // Advance the entropy chain — Pyth's own entropy propagates forward
        lastEntropy = randomNumber;

        (uint32[10] memory fids, uint32[10] memory variants) =
            _deriveSlots(pack.tier, randomNumber);

        emit PackFulfilled(packId, fids, variants);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // mintPack — server calls this after reading the PackFulfilled event
    //
    // Server resolves each rolled FID via the Faces API, picks the variant at
    // variantHint % totalVariants, then submits here.
    //
    // Contract re-derives the expected FIDs from the stored seed — the server
    // cannot swap a card for a different FID than what Pyth rolled.
    // ─────────────────────────────────────────────────────────────────────────
    function mintPack(
        uint256           packId,
        string[] calldata imageIds,       // Faces API image ID per slot
        uint256[] calldata fids,          // must match Pyth roll
        uint256[] calldata serials,       // 1 to fid (server picks)
        uint256[] calldata totalVariants  // number of PFP variants in Faces for this FID
    )
        external
        onlyRole(MINTER_ROLE)
        nonReentrant
    {
        Pack storage pack = packs[packId];
        require(pack.fulfilled, "Pyth entropy not yet fulfilled");
        require(!pack.minted,   "already minted");
        require(
            imageIds.length     == 10 &&
            fids.length         == 10 &&
            serials.length      == 10 &&
            totalVariants.length == 10,
            "must provide exactly 10 cards"
        );

        // Re-derive expected slot values from the stored Pyth seed
        (uint32[10] memory rolledFids, uint32[10] memory rolledVariants) =
            _deriveSlots(pack.tier, pack.seed);

        uint256[] memory tokenIds = new uint256[](10);

        for (uint256 i = 0; i < 10; i++) {
            // ── FID must match what Pyth rolled — no cherry-picking ────────────
            require(fids[i] == rolledFids[i], "FID does not match Pyth roll");

            // ── Variant derived from entropy ────────────────────────────────
            uint256 expectedVariant = totalVariants[i] > 1
                ? rolledVariants[i] % totalVariants[i]
                : 0;

            // ── Supply cap: max copies = FID number ────────────────────────
            bytes32 idHash = keccak256(bytes(imageIds[i]));
            require(mintCount[idHash] < fids[i], "card supply exhausted");
            require(serials[i] >= 1 && serials[i] <= fids[i], "serial out of range");

            // ── Unique (imageId, serial) pair ──────────────────────────────
            uint256 tokenId = uint256(keccak256(abi.encodePacked(imageIds[i], serials[i])));
            require(!tokenMinted[tokenId], "serial already minted");

            // ── Commit ────────────────────────────────────────────────────
            mintCount[idHash]++;
            tokenMinted[tokenId]  = true;
            tokenFid[tokenId]     = fids[i];
            tokenSerial[tokenId]  = serials[i];
            tokenVariant[tokenId] = expectedVariant;
            tokenIds[i]           = tokenId;

            _mint(pack.buyer, tokenId, 1, "");
        }

        pack.minted = true;
        emit PackMinted(packId, tokenIds);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal: deterministic slot derivation from Pyth seed
    // ─────────────────────────────────────────────────────────────────────────
    function _deriveSlots(uint8 tier, bytes32 seed)
        internal
        view
        returns (uint32[10] memory fids, uint32[10] memory variants)
    {
        uint8[10] memory rarities = _rollRarities(tier, seed);

        for (uint256 i = 0; i < 10; i++) {
            uint256 h   = uint256(keccak256(abi.encodePacked(seed, "slot", uint8(i))));
            uint8   r   = rarities[i];
            fids[i]     = uint32(FID_START[r] + (h % FID_SIZE[r]));
            variants[i] = uint32(h >> 128);
        }
    }

    function _rollRarities(uint8 tier, bytes32 seed)
        internal
        view
        returns (uint8[10] memory rarities)
    {
        uint16[5] memory w = _weights(tier);

        for (uint256 i = 0; i < 10; i++) {
            uint256 h    = uint256(keccak256(abi.encodePacked(seed, "rarity", uint8(i))));
            uint16  roll = uint16(h % 10000);
            uint16  cum  = 0;
            for (uint8 r = 0; r < 5; r++) {
                cum += w[r];
                if (roll < cum) { rarities[i] = r; break; }
            }
        }

        // Guarantee enforcement: at least one slot must meet the tier minimum
        uint8 guar = _guarantee(tier);
        if (guar == 255) return rarities;

        bool  met       = false;
        uint8 worstIdx  = 0;
        uint8 worstVal  = 0;
        for (uint256 i = 0; i < 10; i++) {
            if (rarities[i] <= guar) met = true;
            if (rarities[i] > worstVal) { worstVal = rarities[i]; worstIdx = uint8(i); }
        }
        if (!met) rarities[worstIdx] = guar;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View: read back slots for a fulfilled pack (server / frontend use)
    // ─────────────────────────────────────────────────────────────────────────
    function getPackSlots(uint256 packId)
        external
        view
        returns (
            uint32[10] memory fids,
            uint32[10] memory variants,
            uint8[10]  memory rarities
        )
    {
        Pack storage pack = packs[packId];
        require(pack.fulfilled, "not fulfilled yet");
        rarities = _rollRarities(pack.tier, pack.seed);
        (fids, variants) = _deriveSlots(pack.tier, pack.seed);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    function _tierPrice(uint8 tier) internal pure returns (uint256) {
        if (tier == 0) return PRICE_SCROLL;
        if (tier == 1) return PRICE_TABLET;
        return PRICE_CODEX;
    }

    function _guarantee(uint8 tier) internal pure returns (uint8) {
        if (tier == 1) return GUARANTEE_TABLET;
        if (tier == 2) return GUARANTEE_CODEX;
        return GUARANTEE_SCROLL;
    }

    function _weights(uint8 tier) internal view returns (uint16[5] memory) {
        if (tier == 0) return W0;
        if (tier == 1) return W1;
        return W2;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin: update Pyth provider (e.g. swap to a faster provider)
    // ─────────────────────────────────────────────────────────────────────────
    function setEntropyProvider(address provider) external onlyRole(DEFAULT_ADMIN_ROLE) {
        entropyProvider = provider;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Token URI
    // ─────────────────────────────────────────────────────────────────────────
    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(baseURI, tokenId.toString()));
    }

    function setBaseURI(string calldata newURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        baseURI = newURI;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Revenue
    // ─────────────────────────────────────────────────────────────────────────
    function withdrawUsdc(address to, uint256 amount) external onlyRole(WITHDRAWER_ROLE) {
        require(USDC.transfer(to, amount), "USDC transfer failed");
    }

    function withdrawAll(address to) external onlyRole(WITHDRAWER_ROLE) {
        require(USDC.transfer(to, USDC.balanceOf(address(this))), "USDC transfer failed");
    }

    // Reclaim ETH oracle reserve
    function withdrawEth(address payable to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        (bool ok,) = to.call{value: amount}("");
        require(ok, "ETH transfer failed");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Royalty
    // ─────────────────────────────────────────────────────────────────────────
    function setRoyalty(address receiver, uint96 feeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setDefaultRoyalty(receiver, feeBps);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Pause
    // ─────────────────────────────────────────────────────────────────────────
    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    // ─────────────────────────────────────────────────────────────────────────
    // Interface support
    // ─────────────────────────────────────────────────────────────────────────
    function supportsInterface(bytes4 id)
        public
        view
        override(ERC1155, ERC2981, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(id);
    }
}
