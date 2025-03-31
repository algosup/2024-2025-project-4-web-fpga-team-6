import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'jsonFormat',
  standalone: true
})
export class JsonFormatPipe implements PipeTransform {
  transform(value: any): string {
    if (!value) return '';
    return JSON.stringify(value, null, 2);
  }
}