import { RequestRepository } from "./RequestRepository";
import { types } from "../util/sql/queries";

export class TradeRequestRepository extends RequestRepository {
    type: string = types.EXCHANGE;
}
