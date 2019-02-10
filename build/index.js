"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var server_1 = __importDefault(require("./server/server"));
var PORT = process.env.port || 3000;
server_1.default.listen(PORT, function () {
    console.log("Express server listening on port " + PORT);
});
//pruebas
var moment = require("moment");
console.log(new Date().getTime());
console.log(moment('2015-01-01', 'YYYY-MM-DD').toDate().getTime());
