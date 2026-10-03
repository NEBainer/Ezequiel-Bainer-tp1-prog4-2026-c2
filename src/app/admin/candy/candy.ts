import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CandyService } from '../../services/candy.service';
import { LogService } from '../../services/log.service';
import { Categoria, Combo, Producto } from '../../interfaces/Candy';

@Component({
  selector: 'app-admin-candy',
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './candy.html',
  styleUrl: './candy.css',
})
export class AdminCandy implements OnInit {
  private candyS = inject(CandyService);
  private logS = inject(LogService);
  private fb = inject(FormBuilder);

  categorias = signal<Categoria[]>([]);
  productos = signal<Producto[]>([]);
  combos = signal<Combo[]>([]);
  mensaje = signal<string | null>(null);

  productoEditando = signal<Producto | null>(null);
  comboEditando = signal<Combo | null>(null);

  formCategoria = this.fb.group({
    nombre: ['', Validators.required],
  });

  formProducto = this.fb.group({
    nombre: ['', Validators.required],
    categoria_id: [null as number | null, Validators.required],
    precio: [null as number | null, [Validators.required, Validators.min(0)]],
    puntos: [null as number | null, Validators.min(1)], // vacío = no se puede canjear
    activo: [true],
  });

  formCombo = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
    precio: [null as number | null, [Validators.required, Validators.min(0)]],
    activo: [true],
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    const [categorias, productos, combos] = await Promise.all([
      this.candyS.traerCategorias(),
      this.candyS.traerProductos(),
      this.candyS.traerCombos(),
    ]);
    this.categorias.set(categorias);
    this.productos.set(productos);
    this.combos.set(combos);
  }

  nombreCategoria(id: number) {
    return this.categorias().find((c) => c.id === id)?.nombre ?? '';
  }

  // ---------- Categorías ----------

  async crearCategoria() {
    if (this.formCategoria.invalid) {
      return;
    }
    const nombre = this.formCategoria.value.nombre!.trim();
    const { error } = await this.candyS.crearCategoria(nombre);
    this.mensaje.set(error ? 'No se pudo crear (¿ya existe?).' : null);
    if (!error) {
      await this.logS.registrar('Creó una categoría', nombre);
      this.formCategoria.reset();
      await this.cargar();
    }
  }

  async borrarCategoria(c: Categoria) {
    const { error } = await this.candyS.borrarCategoria(c.id);
    if (error) {
      this.mensaje.set(`"${c.nombre}" tiene productos: primero movelos o borralos.`);
      return;
    }
    await this.logS.registrar('Borró una categoría', c.nombre);
    await this.cargar();
  }

  // ---------- Productos ----------

  editarProducto(p: Producto) {
    this.productoEditando.set(p);
    this.formProducto.reset({ ...p });
  }

  cancelarProducto() {
    this.productoEditando.set(null);
    this.formProducto.reset({ activo: true });
  }

  async guardarProducto() {
    if (this.formProducto.invalid) {
      this.formProducto.markAllAsTouched();
      return;
    }
    const v = this.formProducto.value;
    const producto = {
      nombre: v.nombre!.trim(),
      categoria_id: Number(v.categoria_id),
      precio: Number(v.precio),
      puntos: v.puntos ? Number(v.puntos) : null,
      activo: !!v.activo,
    };
    const editando = this.productoEditando();
    const { error } = editando
      ? await this.candyS.modificarProducto(editando.id, producto)
      : await this.candyS.crearProducto(producto);
    if (error) {
      this.mensaje.set('No se pudo guardar el producto.');
      return;
    }

    if (editando && Number(editando.precio) !== producto.precio) {
      await this.logS.registrar('Modificó un precio', `${producto.nombre}: $${editando.precio} → $${producto.precio}`);
    } else if (editando && editando.puntos !== producto.puntos) {
      await this.logS.registrar('Modificó puntos de canje', `${producto.nombre}: ${editando.puntos ?? '—'} → ${producto.puntos ?? '—'} pts`);
    } else {
      await this.logS.registrar(editando ? 'Modificó un producto' : 'Creó un producto', producto.nombre);
    }
    this.cancelarProducto();
    await this.cargar();
  }

  async borrarProducto(p: Producto) {
    await this.candyS.borrarProducto(p.id);
    await this.logS.registrar('Borró un producto', p.nombre);
    await this.cargar();
  }

  // ---------- Combos ----------

  editarCombo(c: Combo) {
    this.comboEditando.set(c);
    this.formCombo.reset({ ...c });
  }

  cancelarCombo() {
    this.comboEditando.set(null);
    this.formCombo.reset({ activo: true });
  }

  async guardarCombo() {
    if (this.formCombo.invalid) {
      this.formCombo.markAllAsTouched();
      return;
    }
    const v = this.formCombo.value;
    const combo = {
      nombre: v.nombre!.trim(),
      descripcion: v.descripcion!.trim(),
      precio: Number(v.precio),
      activo: !!v.activo,
    };
    const editando = this.comboEditando();
    const { error } = editando
      ? await this.candyS.modificarCombo(editando.id, combo)
      : await this.candyS.crearCombo(combo);
    if (error) {
      this.mensaje.set('No se pudo guardar el combo.');
      return;
    }
    if (editando && Number(editando.precio) !== combo.precio) {
      await this.logS.registrar('Modificó un precio', `${combo.nombre}: $${editando.precio} → $${combo.precio}`);
    } else {
      await this.logS.registrar(editando ? 'Modificó un combo' : 'Creó un combo', combo.nombre);
    }
    this.cancelarCombo();
    await this.cargar();
  }

  async borrarCombo(c: Combo) {
    await this.candyS.borrarCombo(c.id);
    await this.logS.registrar('Borró un combo', c.nombre);
    await this.cargar();
  }
}
