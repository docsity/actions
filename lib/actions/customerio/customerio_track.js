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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerIoTrackAction = void 0;
const Hub = require("../../hub");
const customerio_1 = require("./customerio");
class CustomerIoTrackAction extends customerio_1.CustomerIoAction {
    constructor() {
        super(...arguments);
        this.name = "customerio_track";
        this.label = "Customer.io Track";
        this.iconName = "customerio/customerio.png";
        this.description = "Add traits via track to your customer.io users.";
        this.minimumSupportedLookerVersion = "5.5.0";
    }
    execute(request) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.executeCustomerIo(request, customerio_1.CustomerIoCalls.Track);
        });
    }
    form() {
        return __awaiter(this, void 0, void 0, function* () {
            const form = new Hub.ActionForm();
            form.fields = [
                {
                    name: "event",
                    label: "Event",
                    description: "The name of the event you’re tracking.",
                    type: "string",
                    required: true,
                },
                {
                    description: "Override default api key",
                    label: "Override API Key",
                    name: "override_customer_io_api_key",
                    required: false,
                }, {
                    description: "Override default site id",
                    label: "Override Site ID",
                    name: "override_customer_io_site_id",
                    required: false,
                },
            ];
            return form;
        });
    }
}
exports.CustomerIoTrackAction = CustomerIoTrackAction;
Hub.addAction(new CustomerIoTrackAction());
