"use strict";

//Butterworth filter algorithm based on:
//https://www.dsprelated.com/showarticle/1119.php
//getPolynomial function based on:
//https://www.mathworks.com/help/matlab/ref/poly.html

export const name = 'Butterworth';
export const tooltip = 'Filtro Butterworth';
export const func = function ({order, fc, unit, dt}) {
  const fs = 1 / dt;
  const useHz = unit === 'Hz';
  
  //STEP 1: find poles of a butterworth with cutoff freq = 1rad/s
  let pole = []; //poles array
  for (let i = 0; i < order; i++) {
    let theta = (2 * i + 1) * Math.PI / (2 * order);
    pole.push([-Math.sin(theta), Math.cos(theta)]);
  }
  //STEP 2: pole scale factor, given by the cutoff frequency
  //converts the cutoff freq of 1rad/s to the desired one
  let pScale;
  if (useHz) {pScale = 2 * fs * Math.tan(Math.PI * dt * fc);}
  else {pScale = 2 * fs * Math.tan(dt * fc / 2);}
  //STEP 3: scaling poles with pole scale factor
  for (let i = 0; i < order; i++) {
    pole[i][0] = pScale * pole[i][0];
    pole[i][1] = pScale * pole[i][1];
  }
  //STEP 4: transforming the poles from the s-plane to the
  //z-plane using the bilinear transform
  for (let i = 0; i < order; i++) {
    //  The bilinear transform to be calculated on each pole
    //
    //        1 + pole / (2 * fs)
    // pole = -------------------
    //        1 - pole / (2 * fs)

    // re and im are the real and imaginary values of: pole / (2 * fs)
    let re = dt * pole[i][0] / 2;
    let im = dt * pole[i][1] / 2;
    //we can rearrange the bilinear transform to get the following equation
    //              -2 * (re - 1)                               2 * im   
    // Re(pole) = ----------------- - 1   and   Im(pole) = -----------------
    //            (re - 1)^2 + im^2                        (re - 1)^2 + im^2
    let den = (re - 1) * (re - 1) + im * im; //den = (re - 1)^2 + im^2
    pole[i][0] = (-2 * (re - 1) / den) - 1; //Re(pole)
    pole[i][1] = 2 * im / den;
  }
  //STEP 5: adding zeros to the transfer function at z = -1
  //The number of zeros is the number of the filter order
  let zeros = Array(order).fill(-1); //zeros array
  //STEP 6: convert poles and zeros to polynomials with coefficients
  //b for numerator, and a for denominator
  function getPolynomial(v, complex) {
    const n = v.length;
    let poly = Array(n + 1);
    if (!complex) {
      poly.fill(0);
      poly[0] = 1;
      for (let i = 0; i < n; i++) {
        for (let j = i; j >= 0; j--) {
          poly[j + 1] = poly[j + 1] - v[i] * poly[j]
        }
      }
    }
    else {
      for (let i = 0; i < n + 1; i++) {poly[i] = [0, 0];}
      poly[0][0] = 1;
      let prod = Array(2);
      for (let i = 0; i < n; i++) {
        for (let j = i; j >= 0; j--) {
          //multiplying v[i] and poly[j]
          prod[0] = v[i][0] * poly[j][0] - v[i][1] * poly[j][1]; //Real part
          prod[1] = v[i][0] * poly[j][1] + v[i][1] * poly[j][0];//Imaginary part
          //subtracting the result from poly[j + 1]
          poly[j + 1][0] = poly[j + 1][0] - prod[0]; //Real part
          poly[j + 1][1] = poly[j + 1][1] - prod[1]; //Imaginary part
        }
      }
    }
    return poly;
  }
  let b = getPolynomial(zeros);
  let a = getPolynomial(pole, true);
  a = a.map(d => d[0]); //select only the real part of the a coefficients
  //STEP 7: adjust b coefficients so that the gain at 0Hz is equal to 1
  //for a gain of 1 at 0Hz -> K = sum(a) / sum(b)
  let K = a.reduce((acc, cur) => acc + cur) / b.reduce((acc, cur) => acc + cur);
  b = b.map(d => K * d);
  return [b, a];
};
export const type = 'static';
export const outputs = {name: 'Coefficients', type: 'points'};
export const args = [
  {name: 'order', type: 'number', min: 1, step: 1, value: 2},
  {name: 'fc', type: 'number', min: 0, value: 1, tooltip: 'Frequência de corte'},
  {
    name: 'unit', type: 'select',
    option: [
      {name: 'Hz'},
      {name: 'rad/s'}
    ],
    tooltip: 'Unidade da frequência de corte'
  },
  {
    name: 'dt', type: 'number', min: 0, value: 1,
    tooltip: 'Intervalo de tempo entre amostras'
  }
];