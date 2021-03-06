import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Router, CanActivate } from '@angular/router';
import { debounceTime } from 'rxjs/internal/operators/debounceTime';
import { AuthBearer } from '../models/authentication/IAuthBearer';
import { distinctUntilChanged } from 'rxjs/internal/operators/distinctUntilChanged';
import { map } from 'rxjs/operators';
import { catchError } from 'rxjs/internal/operators/catchError';
import { Observable } from 'rxjs/internal/Observable';
import { of } from 'rxjs';
import { UserLogin } from '../models/masterdata/UserLogin.model';

@Injectable()
export class AuthService implements CanActivate{
  private tokeyKey = "token";
  private urlToken = "http://localhost:41570/api/TokenAuth/Login";

  constructor(private http: HttpClient, private router: Router) {
  }

  public canActivate() {
    if (this.checkLogin()) {
        return true;
    } else {
        this.router.navigate(['login']);
        return false;
    }
  }
  public login$(userLoginVm: UserLogin) {
    let header = new HttpHeaders().set('Content-Type', 'application/json');
    let body = JSON.stringify(userLoginVm);
    let options = { headers: header };

    return this.http.put<AuthBearer>(this.urlToken, body, options).pipe(
        debounceTime(200),
        distinctUntilChanged(),
        map(
            res => {
                let result = res;
                if (result.state && result.state == 1 && result.data && result.data.accessToken) {
                    sessionStorage.setItem(this.tokeyKey, result.data.accessToken);
                }
                return result;
            }
        ),

        catchError(this.handleError<AuthBearer>("login"))
    )
  }

  public authGet$(url) {
      let header = this.initAuthHeaders();
      let options = { headers: header };
      return this.http.get<any>(url, options).pipe(
          debounceTime(200),
          distinctUntilChanged(),
          catchError(this.handleError<any>("authGet")));
  }

  public checkLogin(): boolean {
      let token = sessionStorage.getItem(this.tokeyKey);
      return token != null;
  }

  public getUserInfo$() {
      return this.authGet$(this.urlToken);
  }

  public authPost$(url: string, body: any) {
      let headers = this.initAuthHeaders();

      return this.http.post(url, body, { headers: headers }).pipe(
          debounceTime(200),
          distinctUntilChanged(),
          catchError(this.handleError("authPost"))
      )
  }

  private getLocalToken(): string {
      return sessionStorage.getItem(this.tokeyKey);
  }

  private initAuthHeaders(): HttpHeaders {
      let token = this.getLocalToken();
      if (token == null) throw "No token";

      let headers = new HttpHeaders()
          .set('Content-Type', 'application/json')
          .set("Authorization", "Bearer " + token);
      return headers;
  }

  private handleError<T>(operation = 'operation', result?: T) {
      return (error: any): Observable<T> => {
          console.error(`${operation} error: ${error.message}`);
          return of(result as T);
      };
  }
}
