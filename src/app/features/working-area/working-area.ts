import { Component } from '@angular/core';
import { RequestBar } from './request-bar/request-bar';
import { ConfigBar } from './config-bar/config-bar';
import { ResponseSection } from './response-section/response-section';

@Component({
  selector: 'app-working-area',
  imports: [RequestBar, ConfigBar, ResponseSection],
  templateUrl: './working-area.html',
  styleUrl: './working-area.scss',
})
export class WorkingArea {

}
