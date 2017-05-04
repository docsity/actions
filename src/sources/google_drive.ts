import * as D from "../framework";
import * as googleAuth from "google-auth-library";
import * as google from "googleapis";

export class GoogleDriveSource extends D.DestinationSource {

  public async sourcedDestinations() {

    let dest = new D.Destination();
    dest.name = "google_drive";
    dest.label = "Google Drive";
    dest.description = "Send download results directly to your Google Drive.";
    dest.params = [
      {
        description: "An OAuth access token for Google APIs that's authorized to read and write files on Google Drive.",
        label: "Google API OAuth Token",
        name: "google_oauth_token",
        required: true,
      },
    ];

    dest.action = (request) => {
      return new Promise<D.DataActionResponse>((resolve, reject) => {

        if (!request.attachment) {
          reject("No attachment.");
          return;
        }

        let auth  = googleClientFromRequest(request);
        let drive = google.drive("v3");

        drive.files.create({
          auth,
          fields: "id",
          media: {
            body: request.attachment.dataBuffer,
          },
          resource: {
            name: request.suggestedFilename(),
          },
        }, (err, file) => {
          if (err) {
            reject(err);
          } else {
            resolve(new D.DataActionResponse());
          }
        });
      });

    };

    dest.form = (request) => {

      let promise = new Promise<D.DataActionForm>((resolve, reject) => {

          let auth = googleClientFromRequest(request);

          let drive = google.drive("v3");
          drive.files.list({
            auth,
            fields: "nextPageToken, files(id, name)",
            pageSize: 10,
          }, (err, response) => {

            if (err) {
              reject(err);
            }

            let form = new D.DataActionForm();

            form.fields = [{
              label: "Folder",
              name: "path",
              options: response.files.map((f: {id, name}) => {
                return {name: f.id, label: f.name};
              }),
              required: true,
              type: "select",
            }, {
              description: "Leave blank to use a suggested filename including the date and time.",
              label: "Filename",
              name: "filename",
            }];

            resolve(form);

          });

      });

      return promise;

    };

    return [dest];

  }

}

function googleClientFromRequest(request: D.DataActionRequest) {
  if (!request.params) {
    throw "No params provided.";
  }

  let accessToken = request.params.google_oauth_token;

  if (!accessToken) {
    throw "No google_oauth_token provided.";
  }

  let auth = new googleAuth();
  let oauth2 = new auth.OAuth2();
  oauth2.credentials = {access_token: accessToken};
  return oauth2;
}