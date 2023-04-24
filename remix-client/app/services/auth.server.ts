// We need to import from Remix Auth the type of the strategy verify callback
import type { StrategyVerifyCallback } from "remix-auth";
// We need to import the OAuth2Strategy, the verify params and the profile interfaces
import type {
  OAuth2Profile,
  OAuth2StrategyVerifyParams,
} from "remix-auth-oauth2";
import { OAuth2Strategy } from "remix-auth-oauth2";

// These are the custom options we need from the developer to use the strategy
export interface Auth0StrategyOptions {
  audience: any;
  scope: string;
  domain: string;
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}

// This interface declare what extra params we will get from Auth0 on the
// verify callback
export interface Auth0ExtraParams extends Record<string, string | number> {
  id_token: string;
  scope: string;
  expires_in: 86_400;
  token_type: "Bearer";
}

// The Auth0Profile extends the OAuth2Profile with the extra params and mark
// some of them as required
export interface Auth0Profile extends OAuth2Profile {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
    middleName: string;
  };
  emails: Array<{ value: string }>;
  photos: Array<{ value: string }>;
  _json: {
    sub: string;
    name: string;
    given_name: string;
    family_name: string;
    middle_name: string;
    nickname: string;
    preferred_username: string;
    profile: string;
    picture: string;
    website: string;
    email: string;
    email_verified: boolean;
    gender: string;
    birthdate: string;
    zoneinfo: string;
    locale: string;
    phone_number: string;
    phone_number_verified: boolean;
    address: {
      country: string;
    };
    updated_at: string;
  };
}

// And we create our strategy extending the OAuth2Strategy, we also need to
// pass the User as we did on the FormStrategy, we pass the Auth0Profile and the
// extra params
export class Auth0Strategy<User> extends OAuth2Strategy<
  User,
  Auth0Profile,
  Auth0ExtraParams
> {
  // The OAuth2Strategy already has a name but we override it to be specific of
  // the service we are using
  name = "auth0";

  private userInfoURL: string;
  scope: string;
  audience: any;

  // We receive our custom options and our verify callback
  constructor(
    options: Auth0StrategyOptions,
    // Here we type the verify callback as a StrategyVerifyCallback receiving
    // the User type and the OAuth2StrategyVerifyParams with the Auth0Profile
    // and the Auth0ExtraParams
    // This way, when using the strategy the verify function will receive as
    // params an object with accessToken, refreshToken, extraParams and profile.
    // The latest two matching the types of Auth0Profile and Auth0ExtraParams.
    verify: StrategyVerifyCallback<
      User,
      OAuth2StrategyVerifyParams<Auth0Profile, Auth0ExtraParams>
    >
  ) {
    // And we pass the options to the super constructor using our own options
    // to generate them, this was we can ask less configuration to the developer
    // using our strategy
    super(
      {
        authorizationURL: `https://${options.domain}/authorize`,
        tokenURL: `https://${options.domain}/oauth/token`,
        clientID: options.clientID,
        clientSecret: options.clientSecret,
        callbackURL: options.callbackURL,
      },
      verify
    );

    this.userInfoURL = `https://${options.domain}/userinfo`;
    this.scope = options.scope || "openid profile email";
    this.audience = options.audience;
  }

  // We override the protected authorizationParams method to return a new
  // URLSearchParams with custom params we want to send to the authorizationURL.
  // Here we add the scope so Auth0 can use it, you can pass any extra param
  // you need to send to the authorizationURL here base on your provider.
  protected authorizationParams() {
    const urlSearchParams: Record<string, string> = {
      scope: this.scope,
    };

    if (this.audience) {
      urlSearchParams.audience = this.audience;
    }

    return new URLSearchParams(urlSearchParams);
  }

  // We also override how to use the accessToken to get the profile of the user.
  // Here we fetch a Auth0 specific URL, get the profile data, and build the
  // object based on the Auth0Profile interface.
  protected async userProfile(accessToken: string): Promise<Auth0Profile> {
    let response = await fetch(this.userInfoURL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let data: Auth0Profile["_json"] = await response.json();

    let profile: Auth0Profile = {
      provider: "auth0",
      displayName: data.name,
      id: data.sub,
      name: {
        familyName: data.family_name,
        givenName: data.given_name,
        middleName: data.middle_name,
      },
      emails: [{ value: data.email }],
      photos: [{ value: data.picture }],
      _json: data,
    };

    return profile;
  }
}
