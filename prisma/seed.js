"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcryptjs_1 = __importDefault(require("bcryptjs"));
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var areaPusat, warehousePusat, passwordHash, masterUser, categories, _i, categories_1, cat, itemTypes, _a, itemTypes_1, type, itemStatuses, _b, itemStatuses_1, status_1, switchCat;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('Starting DB Seed...');
                    return [4 /*yield*/, prisma.area.upsert({
                            where: { name: 'JABODETABEK' },
                            update: {},
                            create: {
                                name: 'JABODETABEK',
                            },
                        })
                        // 2. Setup Warehouse Pusat
                    ];
                case 1:
                    areaPusat = _c.sent();
                    return [4 /*yield*/, prisma.warehouse.create({
                            data: {
                                name: 'Gudang Pusat Jakarta',
                                type: 'PUSAT',
                                areaId: areaPusat.id,
                                location: 'Jakarta',
                            },
                        })
                        // 3. Setup Master Admin User
                    ];
                case 2:
                    warehousePusat = _c.sent();
                    return [4 /*yield*/, bcryptjs_1.default.hash('!Tahun2026', 10)];
                case 3:
                    passwordHash = _c.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { username: 'hendra@servicex.id' },
                            update: {},
                            create: {
                                username: 'hendra@servicex.id',
                                password: passwordHash,
                                name: 'Hendra',
                                level: 'MASTER',
                                isActive: true,
                                warehouseId: warehousePusat.id,
                                jabatan: 'System Administrator',
                            },
                        })
                        // 4. Setup Categories
                    ];
                case 4:
                    masterUser = _c.sent();
                    categories = ['SWITCH', 'ROUTER', 'SFP', 'ONT', 'CABLE', 'ACCESSORY'];
                    _i = 0, categories_1 = categories;
                    _c.label = 5;
                case 5:
                    if (!(_i < categories_1.length)) return [3 /*break*/, 8];
                    cat = categories_1[_i];
                    return [4 /*yield*/, prisma.category.create({
                            data: {
                                name: cat,
                            }
                        })];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8:
                    itemTypes = ['Baru', 'Dismantle', 'Rusak', 'Return', 'Awal'];
                    _a = 0, itemTypes_1 = itemTypes;
                    _c.label = 9;
                case 9:
                    if (!(_a < itemTypes_1.length)) return [3 /*break*/, 12];
                    type = itemTypes_1[_a];
                    return [4 /*yield*/, prisma.itemType.upsert({
                            where: { name: type },
                            update: {},
                            create: { name: type },
                        })];
                case 10:
                    _c.sent();
                    _c.label = 11;
                case 11:
                    _a++;
                    return [3 /*break*/, 9];
                case 12:
                    itemStatuses = ['Belum disetujui', 'Disetujui', 'Ditolak', 'On Progress', 'Di Return', 'In Stock', 'Dipakai', 'Rusak'];
                    _b = 0, itemStatuses_1 = itemStatuses;
                    _c.label = 13;
                case 13:
                    if (!(_b < itemStatuses_1.length)) return [3 /*break*/, 16];
                    status_1 = itemStatuses_1[_b];
                    return [4 /*yield*/, prisma.itemStatus.upsert({
                            where: { name: status_1 },
                            update: {},
                            create: { name: status_1 },
                        })];
                case 14:
                    _c.sent();
                    _c.label = 15;
                case 15:
                    _b++;
                    return [3 /*break*/, 13];
                case 16: return [4 /*yield*/, prisma.category.findFirst({ where: { name: 'SWITCH' } })];
                case 17:
                    switchCat = _c.sent();
                    if (!switchCat) return [3 /*break*/, 19];
                    return [4 /*yield*/, prisma.item.upsert({
                            where: { code: 'SW-RB4011' },
                            update: {},
                            create: {
                                code: 'SW-RB4011',
                                name: 'Mikrotik RB4011',
                                hasSN: true,
                                minStock: 5,
                                categoryId: switchCat.id,
                            }
                        })];
                case 18:
                    _c.sent();
                    _c.label = 19;
                case 19:
                    console.log("Seed successfully finished! Created Master user: ".concat(masterUser.username));
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
