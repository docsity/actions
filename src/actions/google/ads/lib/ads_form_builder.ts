import * as Hub from "../../../../hub"
import { GoogleAdsActionRequest } from "./ads_request"

const CREATE_LIST_OPTION_NAME = "create"

interface SelectFormOption {name: string, label: string}

interface AdsCustomer {
  resourceName: string
  manager: boolean
  descriptiveName: string
  id: string
}

export class GoogleAdsActionFormBuilder {

  readonly apiClient = this.adsRequest.apiClient!
  readonly createOrAppend = this.adsRequest.createOrAppend
  readonly mobileDevice = this.adsRequest.mobileDevice
  readonly mobileAppId = this.adsRequest.mobileAppId
  readonly isMobileDevice = this.adsRequest.isMobileDevice
  readonly uploadKeyType = this.adsRequest.uploadKeyType
  readonly completedFormParams = this.adsRequest.formParams
  readonly isCreate = this.adsRequest.isCreate
  readonly loginCid = this.adsRequest.loginCid
  readonly targetCid = this.adsRequest.targetCid
  readonly targetUserListRN = this.adsRequest.targetUserListRN
  loginCustomer?: AdsCustomer
  targetCustomer?: AdsCustomer

  constructor(readonly adsRequest: GoogleAdsActionRequest) {}

  async makeForm() {
    const form = new Hub.ActionForm()

    // 0) Fetch objects for fields that have been filled in already
    await Promise.all([
      this.maybeSetLoginCustomer(),
      this.maybeSetTargetCustomer(),
    ])

    // 1a) User must first pick a login account from the dropdown, which will be the only field to show at first
    form.fields.push(await this.loginCidField())
    if (!this.loginCustomer) { return form }

    // 1b) If the chosen login account is a Manager, give the option to pick one of its client accounts as the target.
    if (this.loginCustomer.manager) {
      form.fields.push(await this.targetCidField())
      if (!this.targetCustomer) { return form }
      // If not a manager account, set the targetCustomer to be the same as the loginCustomer
    } else {
      this.targetCustomer = this.loginCustomer
    }

    // 2a) Now choose whether to create a new list or append to an existing one
    form.fields.push(this.createOrAppendField())
    if (!this.createOrAppend) { return form }

    // 2b) Now choose whether to use mobile device ID data
    form.fields.push(this.mobileDeviceField())
    if (!this.mobileDevice) { return form }

    // 2c) If mobile device data, add mobile app id field to form
    if (this.isMobileDevice) {
      form.fields.push(this.mobileAppIdField())
    }

    // 3) Branch 1: Show the fields for creating a new list (name & desc), plus hashing, and we're done
    if (this.isCreate) {
      form.fields.push(this.newListNameField())
      form.fields.push(this.newListDescriptionField())
      form.fields.push(this.doHashingFormField())
      return form
    }

    // 4) Branch 2: Select an existing list, but we need to check that there is at least one to choose...
    const userListOptions = await this.getUserListOptions()
    if (userListOptions.length) {
      form.fields.push(this.targetListField(userListOptions))
      form.fields.push(this.doHashingFormField())
    } else {
      form.fields.push(this.noAvailableListsField())
    }
    return form
  }

  async loginCidField() {
    let selectOptions: SelectFormOption[]
    let description: string

    if (this.loginCustomer) {
      selectOptions = [
        this.selectOptionForCustomer(this.loginCustomer),
      ]
      description = "To reset this selection, please close and re-open the form."
    } else {
      selectOptions = await this.getLoginCidOptions()
      description = "This is like picking an account to work from using the menu in the Google Ads UI."
        + " If you use a manager account to manage clients, choose the relevant manager account here."
        + " If you login directly to an Ads account then choose it here."
    }

    return {
      name: "loginCid",
      label: "Step 1) Choose login account",
      description,
      type: "select" as "select",
      options: selectOptions,
      default: this.loginCid as string,
      interactive: true,
      required: true,
    }
  }

  async targetCidField() {
    let selectOptions: SelectFormOption[]
    let description: string

    if (this.targetCustomer) {
      selectOptions = [
        this.selectOptionForCustomer(this.targetCustomer),
        {name: "", label: "Reset..."},
      ]
      description = "Select \"Reset\" to go back."
    } else {
      selectOptions = await this.getTargetCidOptions()
      description = "This is the account where you want to send data, i.e. where the audience lists are defined."
    }

    return {
      name: "targetCid",
      label: "Step 1b) Choose target account",
      description,
      type: "select" as "select",
      options: selectOptions,
      default: this.targetCid as string,
      interactive: true,
      required: true,
    }
  }

  createOrAppendField() {
    return {
      name: "createOrAppend",
      label: "Step 2a) Create a new list or append to existing?",
      description:
          "Choose whether to create a new list or append to an existing one."
        + " You will then be shown the appropriate fields in the next step.",
      type: "select" as "select",
      options: [
        {name: CREATE_LIST_OPTION_NAME, label: "Create new list"},
        {name: "append", label: "Append to existing"},
      ],
      default: this.createOrAppend as string,
      interactive: true,
      required: true,
    }
  }

  mobileDeviceField() {
    return {
      name: "mobileDevice",
      label: "Step 2b) Are you sending Mobile Device ID data?",
      description:
          "Select this option to use mobile device IDs."
        + " You can perform customer matching using IDFA (Identifier for Advertising)"
        + " or AAID (Google Advertising ID) mobile device IDs."
        + " Note that mobile device IDs cannot be combined with any other types of customer data.",
      type: "select" as "select",
      options: [
        {name: "yes", label: "Yes"},
        {name: "no", label: "No"},
      ],
      default: this.mobileDevice as string,
      interactive: true,
      required: true,
    }
  }

  mobileAppIdField() {
    return {
      name: "mobileAppId",
      label: "Step 2c) Enter the mobile application ID",
      description:
          "A string that uniquely identifies a mobile application from which the data was collected to the Google Ads API."
        + " For iOS, the ID string is the 9 digit string that appears at the end of an App Store URL"
        + " (e.g., http://itunes.apple.com/us/app/APP_NAME/idMOBILE_APP_ID)."
        + " For Android, the ID string is the application's package name"
        + " (e.g., https://play.google.com/store/apps/details?id=MOBILE_APP_ID)",
      type: "string" as "string",
      default: "",
      required: true,
    }
  }

  newListNameField() {
    return {
      name: "newListName",
      label: "Step 3a) New list name",
      type: "string" as "string",
      description: "Name of the new user list",
      default: "",
      required: true,
    }
  }

  newListDescriptionField() {
    return {
      name: "newListDescription",
      label: "Step 3b) New list description",
      type: "string" as "string",
      description: "Description of the new user list",
      default: "",
      required: false,
    }
  }

  targetListField(selectOptions: SelectFormOption[]) {
    return {
      name: "targetUserListRN",
      label: "Step 3) Choose list to update",
      description: "Showing CRM-based lists that are open for updating.",
      type: "select" as "select",
      options: selectOptions,
      default: this.targetUserListRN as string,
      interactive: false,
      required: true,
    }
  }

  noAvailableListsField() {
    return {
      name: "noAvalaibleLists",
      label: "Error: No lists available for update",
      type: "textarea" as "textarea",
      description: "Expand the textarea field to see full message.",
      default: "Couldn't find any CRM-based user lists that are open for new memberships."
        + " If you are looking for a specific list, please check that it is shared with you and open for updates."
        + " You can also create a new list instead.",
      required: false,
    }
  }

  doHashingFormField() {
    return {
      name: "doHashing",
      label: "Step 4) Should the data be hashed first?",
      type: "select" as "select",
      description: "All personal data must be normalized and hashed before uploading to Google Ads."
        + " If your data is not yet hashed, select 'yes' and Looker will attempt to hash the data"
        + " according to Google Ads' requirements."
        + " If 'no' then the data will be sent as-is. This means the report data should already be normalized and"
        + " hashed inside your database."
        + " Note that if the data is not hashed correctly, your customer list will not match any audiences.",
      options: [
        {name: "yes", label: "Yes"},
        {name: "no", label: "No"},
      ],
      default: "yes",
      required: true,
    }
  }

  private async maybeSetLoginCustomer() {
    if (!this.loginCid) {
      return
    }
    this.loginCustomer = await this.getCustomer(this.loginCid)
  }

  private async maybeSetTargetCustomer() {
    if (!this.targetCid) {
      return
    }
    this.targetCustomer = await this.getCustomer(this.targetCid)
  }

  private async getLoginCidOptions() {
    const listCustomersResp = await this.apiClient.listAccessibleCustomers()
    const customerResourceNames = listCustomersResp.resourceNames
    const customers = await Promise.all(customerResourceNames.map(async (rn: string) => {
      const clientCid = rn.replace("customers/", "")
      return this.getCustomer(clientCid)
    }))
    const filteredCustomers = customers.filter(Boolean) as AdsCustomer[]
    const sortedCustomers = filteredCustomers.sort(this.sortCustomersCompareFn)
    const selectOptions = sortedCustomers.map(this.selectOptionForCustomer)
    return selectOptions
  }

  private async getCustomer(cId: string) {
    return await this.apiClient.searchClientCustomers(cId)
      .then((data: any) => {
        const cust  = data[0].results.filter((c: any) => c.customerClient.id === cId)[0].customerClient
        if (!cust.descriptiveName) { cust.descriptiveName = "Untitled" }
        return cust as AdsCustomer
      })
  }

  private async getTargetCidOptions() {
    if (!this.loginCustomer) {
      throw new Error("Could not reference the login customer record.")
    }
    const searchResp = await this.apiClient.searchClientCustomers(this.loginCustomer.id)
    const searchResults = searchResp.length ? searchResp[0].results : []
    const clients = searchResults.map((result: any) => {
      const client = result.customerClient
      if (!client.descriptiveName) {
        client.descriptiveName = "Untitled"
      }
      return client
    })
    const sortedClients = clients.sort(this.sortCustomersCompareFn)
    const selectOptions = sortedClients.map(this.selectOptionForCustomer)

    return selectOptions
  }

  private selectOptionForCustomer(customer: AdsCustomer) {
    const name = customer.id
    const title = customer.descriptiveName ? customer.descriptiveName : "Untitled"
    const prefix = customer.manager ? "[Manager] " : ""
    const suffix = `(${customer.id})`
    const label = `${prefix}${title} ${suffix}`

    return {name, label} as SelectFormOption
  }

  private sortCustomersCompareFn(a: AdsCustomer, b: AdsCustomer) {
    if (a.manager && !b.manager) {
      return -1
    }
    if (!a.manager && b.manager) {
      return 1
    }
    if (a.descriptiveName < b.descriptiveName) {
      return -1
    }
    return 0
  }

  private async getUserListOptions() {
    if (!this.targetCustomer) {
      throw new Error("Could not reference the target customer record.")
    }
    const searchResp = await this.apiClient.searchOpenUserLists(this.targetCustomer.id, this.uploadKeyType)
    const userListResults = searchResp.length ? searchResp[0].results : []

    const selectOptions = userListResults.map((i: any) => (
      {
        name: i.userList.resourceName,
        label: i.userList.name,
      } as SelectFormOption
    ))

    return selectOptions
  }
}
